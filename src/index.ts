#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Read our own name/version from the package.json shipped alongside dist/,
// so the reported version always matches what was actually published rather
// than a hardcoded string that drifts.
const pkg: { name: string; version: string } = (() => {
  try {
    return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  } catch {
    return { name: "evipedia-mcp", version: "0.0.0" };
  }
})();

const BASE_URL = (process.env.EVIPEDIA_BASE_URL ?? "https://evipedia.ai").replace(/\/$/, "");
// The public suggestion form (evipedia.ai/suggest) posts to Formspree.
// Overridable so the tool can be exercised without hitting the live form.
const SUGGEST_ENDPOINT = process.env.EVIPEDIA_SUGGEST_ENDPOINT ?? "https://formspree.io/f/myknrvdg";
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> { data: T; ts: number }
const cache = new Map<string, CacheEntry<unknown>>();

async function fetchCached<T>(url: string): Promise<T> {
  const now = Date.now();
  const entry = cache.get(url) as CacheEntry<T> | undefined;
  if (entry && now - entry.ts < CACHE_TTL) return entry.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const data = await res.json() as T;
  cache.set(url, { data, ts: now });
  return data;
}

interface SearchEntry {
  short_topic: string;
  // Note: in search.json this is a comma-separated string, NOT an array
  // (reviews.json uses an array for the same field).
  alternate_names: string;
  ep_keywords: string;
  ep_category: string;
  url: string;
}

interface ReviewEntry {
  canonical_name: string;
  alternate_names: string[];
  permalink: string;
  permalink_md: string;
  category: string;
  creation_date: string;
  er_conclusion: string;
}

function toSlug(input: string): string {
  const path = input.startsWith("http") ? new URL(input).pathname : input;
  return path.replace(/\.md$/, "").replace(/^\//, "");
}

const server = new McpServer({ name: pkg.name, version: pkg.version });

server.tool(
  "search_reviews",
  "Search evipedia.ai evidence reviews by name, synonym, keyword, or category. Returns matching reviews with their permalinks and conclusions.",
  { query: z.string().describe("Search query — intervention name, synonym, drug class, or category") },
  async ({ query }) => {
    const [searchIndex, reviewsIndex] = await Promise.all([
      fetchCached<SearchEntry[]>(`${BASE_URL}/search.json`),
      fetchCached<ReviewEntry[]>(`${BASE_URL}/reviews.json`),
    ]);

    const q = query.toLowerCase();
    // Join the two indexes on the slug. search.json's `short_topic` has
    // inconsistent casing across entries, so key/lookup on the reliable
    // lowercase `url` slug instead, case-insensitively.
    const bySlug = new Map(reviewsIndex.map(r => [toSlug(r.permalink).toLowerCase(), r]));

    // Any of these fields may be null/absent in search.json (e.g. ep_keywords
    // is null for ~46% of entries), so coerce before lowercasing.
    const has = (v: string | null | undefined) => (v ?? "").toLowerCase().includes(q);
    const matches = searchIndex.filter(e =>
      has(e.short_topic) ||
      has(e.alternate_names) ||
      has(e.ep_keywords) ||
      has(e.ep_category)
    );

    if (matches.length === 0) {
      return { content: [{ type: "text", text: "No reviews found." }] };
    }

    const text = matches.slice(0, 20).map(e => {
      const r = bySlug.get(toSlug(e.url).toLowerCase());
      return r
        ? `**${r.canonical_name}** — ${r.permalink}\n${r.er_conclusion}`
        : `**${e.short_topic}** — ${e.url}`;
    }).join("\n\n---\n\n");

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_review",
  "Get the full evidence review as raw Markdown.",
  { permalink: z.string().describe("Review slug (e.g. 'rapamycin') or full URL") },
  async ({ permalink }) => {
    const slug = toSlug(permalink);
    const res = await fetch(`${BASE_URL}/${slug}.md`);
    if (!res.ok) throw new Error(`Review not found: ${slug}`);
    const text = await res.text();
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_conclusion",
  "Get just the plain-text conclusion of an evidence review.",
  { permalink: z.string().describe("Review slug (e.g. 'rapamycin') or full URL") },
  async ({ permalink }) => {
    const slug = toSlug(permalink);
    const reviews = await fetchCached<ReviewEntry[]>(`${BASE_URL}/reviews.json`);
    const review = reviews.find(r => toSlug(r.permalink) === slug);
    if (!review) throw new Error(`Review not found: ${slug}`);
    return { content: [{ type: "text", text: review.er_conclusion }] };
  }
);

server.tool(
  "suggest_intervention",
  "Suggest a new intervention for evipedia.ai to review. Submits to evipedia's public suggestion form (the same one at evipedia.ai/suggest). Use only when the user explicitly wants to propose a new intervention — this sends a message to the evipedia team.",
  {
    intervention: z.string().min(1).describe("Name of the intervention to suggest (e.g. 'Urolithin A')"),
    goal: z.string().optional().describe("Optional health or longevity goal the intervention targets"),
    references: z.string().optional().describe("Optional supporting references or links"),
    email: z.string().email().optional().describe("Optional submitter email, so the evipedia team can follow up"),
  },
  async ({ intervention, goal, references, email }) => {
    // Mirror the site's subject composition: cleaned "intervention : goal".
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
    const subject = goal ? `${clean(intervention)} : ${clean(goal)}` : clean(intervention);

    const payload: Record<string, string> = { intervention, subject, tags: "SUGGEST-NEW" };
    if (goal) payload.goal = goal;
    if (references) payload.references = references;
    if (email) payload.email = email;

    const res = await fetch(SUGGEST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Suggestion failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    return {
      content: [{
        type: "text",
        text: `Suggestion submitted: "${intervention}"${goal ? ` (goal: ${goal})` : ""}. Thanks — the evipedia team will review it.`,
      }],
    };
  }
);

server.tool(
  "get_version",
  "Get the running evipedia MCP server's package name and version. Useful to confirm which build is loaded.",
  {},
  async () => ({ content: [{ type: "text", text: `${pkg.name} v${pkg.version}` }] })
);

const transport = new StdioServerTransport();
await server.connect(transport);
