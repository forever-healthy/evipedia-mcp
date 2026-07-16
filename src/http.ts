#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createMcpServer, searchReviews, pkg } from "./tools.js";

const PORT = Number(process.env.PORT ?? 8080);
// Surfaced by /version so we can tell dev and prod instances apart at a glance.
const ENV = process.env.EVIPEDIA_ENV ?? "prod";

function send(res: ServerResponse, status: number, body: string, contentType = "text/plain") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

// --- CORS (public, unauthenticated, read-only API) ---
// `*` is safe here: the server carries no cookies/credentials, so there is no
// victim session to ride, and `*` cannot be combined with credentials anyway.
// Native MCP clients ignore CORS; this exists so browser callers (a web app, a
// docs "try it" widget, a future browser MCP client) can read the response. Set
// on every response, including /mcp.
function setCors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// --- In-memory per-IP rate limiter (fixed window) ---
// One Fly instance today, so this is effectively global; if scaled to multiple
// machines it becomes per-machine (a client could get N× the limit) and would
// need a shared store for exactness. Set SEARCH_RATE_LIMIT=0 to disable.
const RATE_LIMIT = Number(process.env.SEARCH_RATE_LIMIT ?? 60);
const RATE_WINDOW_MS = Number(process.env.SEARCH_RATE_WINDOW_MS ?? 60_000);
const rateHits = new Map<string, { count: number; resetAt: number }>();

// Behind Fly, req.socket.remoteAddress is Fly's proxy — the real client IP is in
// the Fly-Client-IP header (X-Forwarded-For as a fallback for other proxies).
function clientIp(req: IncomingMessage): string {
  const fly = req.headers["fly-client-ip"];
  if (typeof fly === "string" && fly.length) return fly;
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// Returns true when the request is over the limit (a 429 has already been sent).
function rateLimited(req: IncomingMessage, res: ServerResponse): boolean {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const ip = clientIp(req);
  let e = rateHits.get(ip);
  if (!e || now >= e.resetAt) { e = { count: 0, resetAt: now + RATE_WINDOW_MS }; rateHits.set(ip, e); }
  e.count++;
  const resetSec = Math.ceil((e.resetAt - now) / 1000);
  res.setHeader("RateLimit-Limit", String(RATE_LIMIT));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - e.count)));
  res.setHeader("RateLimit-Reset", String(resetSec));
  if (e.count > RATE_LIMIT) {
    res.setHeader("Retry-After", String(resetSec));
    send(res, 429, JSON.stringify({ error: "rate limit exceeded", retryAfter: resetSec }), "application/json");
    return true;
  }
  return false;
}

// Drop expired buckets periodically so the map can't grow unbounded. Unref'd so
// it never keeps the process alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateHits) if (now >= e.resetAt) rateHits.delete(ip);
}, RATE_WINDOW_MS).unref();

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// Stateless MCP: a fresh server + transport per request (sessionIdGenerator
// undefined), so nothing is retained between requests and the app is safe to
// run on multiple machines or restart at any time.
async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  const body = req.method === "POST" ? await readBody(req) : undefined;
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

const app = createHttpServer(async (req, res) => {
  try {
    setCors(res);
    // CORS preflight — answer any OPTIONS with the headers set above.
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // /healthz stays unlimited — Fly's health checks poll it, and a 429 here
    // would get the instance marked unhealthy and pulled from rotation.
    if (url.pathname === "/healthz") return send(res, 200, "ok");

    // Root answers with the same build info as /version, so opening the bare
    // URL is informative rather than a 404.
    if (url.pathname === "/" || url.pathname === "/version") {
      return send(res, 200, JSON.stringify({ name: pkg.name, version: pkg.version, env: ENV }), "application/json");
    }

    // Rate-limit the public compute endpoints (skip the trivial /healthz and
    // /version). /mcp is included because its get_review tool fetches {slug}.md
    // uncached, so a flood there hits evipedia.ai directly.
    if ((url.pathname === "/search" || url.pathname === "/mcp") && rateLimited(req, res)) return;

    // Plain REST search for the ChatGPT Custom GPT Action (OpenAPI, not MCP):
    // returns only the matching reviews as JSON so the GPT gets a small,
    // reliable payload instead of the whole static search.json.
    if (url.pathname === "/search") {
      const q = url.searchParams.get("q");
      if (!q) return send(res, 400, JSON.stringify({ error: "missing query parameter 'q'" }), "application/json");
      const results = await searchReviews(q);
      return send(res, 200, JSON.stringify({ query: q, count: results.length, results }), "application/json");
    }

    if (url.pathname === "/mcp") return handleMcp(req, res);

    return send(res, 404, "Not found");
  } catch (err) {
    if (!res.headersSent) send(res, 500, JSON.stringify({ error: String(err) }), "application/json");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.error(`evipedia-mcp ${pkg.version} (${ENV}) listening on http://0.0.0.0:${PORT}/mcp`);
});
