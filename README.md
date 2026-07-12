![Version 0.1.12](https://img.shields.io/badge/Version-0.1.12-green.svg)
[![Forever Healthy](https://img.shields.io/badge/(c)_2026-Forever_Healthy-573D7D.svg)](https://forever-healthy.org)
![evipedia.ai](./docs/evipedia-header.png)

# Evipedia MCP Server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents query [evipedia.ai](https://evipedia.ai) — our continuously-updated encyclopedia of evidence reviews on health & longevity interventions — and suggest new interventions for review.


### Tools

* `search_reviews(query)` → matching reviews (name/synonym/keyword/category), each with its URL and conclusion
* `list_reviews()` → the full catalogue as `{topic, slug}` pairs (canonical topic + the slug you pass to `get_review`/`get_conclusion`)
* `get_conclusion(slug|url)` → just the review's plain-text conclusion
* `get_review(slug|url)` → the full review as raw Markdown
* `get_metadata(slug|url)` → structured medical metadata as JSON — review dates (`datePublished`/`dateModified`/`lastReviewed`, a freshness signal not in the Markdown), the typed `about` entity with alternate names, and an ordered `citation` list with PubMed PMIDs

  The read tools accept either a bare slug (e.g. `rapamycin`) or a full evipedia.ai URL (e.g. `https://evipedia.ai/rapamycin`) — the URL's last path segment is the slug, so a search result's URL can be passed straight through.
* `suggest_intervention(intervention, goal?, references?, email?)` → submit a new intervention to evipedia's public suggestion form (the same one at [evipedia.ai/suggest](https://evipedia.ai/suggest))
* `get_version()` → the running server's package name and version


## Install

The server is published to npm as **[`evipedia-mcp`](https://www.npmjs.com/package/evipedia-mcp)** and runs over stdio via `npx` — no global install needed.

Add the following to your MCP client's config:

```json
{
  "mcpServers": {
    "evipedia": {
      "command": "npx",
      "args": ["-y", "evipedia-mcp"]
    }
  }
}
```

- **Claude Code** — add to your project's `.mcp.json` (or run `claude mcp add`).
- **Claude Desktop** — add to `claude_desktop_config.json`.
- **Cursor** — add to the MCP settings.

Requires Node.js ≥ 18.

### Try it

In Claude Code, run the bundled **`/demo`** skill to smoke-test the connection — it walks through the read tools (`get_version`, `search_reviews`, `get_review`, `get_conclusion`) against live evipedia.ai data.


## Architecture

The server is a **thin client that only uses evipedia.ai's public endpoints**. It does not depend on the evipedia content repo — the public surfaces are the API by design.

* Fetches live from `https://evipedia.ai` with a small in-process cache (both JSON indexes are tiny)
* Mostly read-only, no auth required. The one write path is `suggest_intervention`, which POSTs to evipedia's public suggestion form (Formspree)


## Public API Surface

Base URL: `https://evipedia.ai`

| Endpoint | Description |
|---|---|
| `GET /reviews.json` | Full catalogue: `canonical_name`, `alternate_names[]`, `permalink`, `permalink_md`, `permalink_meta`, `category`, `creation_date`, `dateModified`, `lastReviewed`, `er_conclusion` |
| `GET /search.json` | Search index: `short_topic`, `alternate_names`, `ep_keywords`, `ep_category`, `url` |
| `GET /{permalink}.md` | Complete review as raw Markdown (frontmatter + full body) |
| `GET /{permalink}.meta.json` | Flattened medical metadata: `slug`, `topic`, `url`, `datePublished`/`dateModified`/`lastReviewed`, `about` (`type`/`name`/`alternateName`), ordered `citation[]` (`name`, `url`, `pmid?`) |
| `GET /llms.txt` | Agent/human signpost — includes the stable section anchor list |
| `GET /sitemap.xml` | Canonical review URLs |
| `GET /feed.xml` | RSS feed of latest updates |
