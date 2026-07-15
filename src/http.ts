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
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/healthz") return send(res, 200, "ok");

    // Root answers with the same build info as /version, so opening the bare
    // URL is informative rather than a 404.
    if (url.pathname === "/" || url.pathname === "/version") {
      return send(res, 200, JSON.stringify({ name: pkg.name, version: pkg.version, env: ENV }), "application/json");
    }

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
