![Version 0.1.0](https://img.shields.io/badge/Version-0.1.0-green.svg)
[![Forever Healthy](https://img.shields.io/badge/(c)_2026-Forever_Healthy-573D7D.svg)](https://forever-healthy.org)

**evipedia-mcp** — MCP Server for [evipedia.ai](https://evipedia.ai)


## What It Does

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents query evipedia.ai — a continuously-updated encyclopedia of hundreds of evidence reviews on health & longevity interventions — and suggest new interventions for review.

### Tools

* `search_reviews(query)` → matching reviews (name / synonym / keyword / category), each with its permalink
* `get_review(permalink)` → the full review as raw Markdown
* `get_conclusion(permalink)` → just the review's plain-text conclusion
* `suggest_intervention(intervention, goal?, references?, email?)` → submit a new intervention to evipedia's public suggestion form (the same one at [evipedia.ai/suggest](https://evipedia.ai/suggest))
* `get_version()` → the running server's package name and version


## Install

The server is published to npm as **[`evipedia-mcp`](https://www.npmjs.com/package/evipedia-mcp)** and runs over stdio via `npx` — no global install needed.

### Claude Code

Add to your project's `.mcp.json` (or run `claude mcp add`):

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

### Claude Desktop / Cursor

Use the same block inside the client's own config (`claude_desktop_config.json` for Claude Desktop; the MCP settings for Cursor):

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

To point at a staging build, add an `env` block with `"EVIPEDIA_BASE_URL": "https://your-preview-host"`.

Requires Node.js ≥ 18.


## Architecture

The server is a **thin client over evipedia.ai's public endpoints only**. It does not depend on the evipedia content repo — the public surfaces are the API by design.

* Fetches live from `https://evipedia.ai` with a small in-process cache (both JSON indexes are tiny)
* Optional `EVIPEDIA_BASE_URL` env var to point at a preview / staging build
* Mostly read-only, no auth required. The one write path is `suggest_intervention`, which POSTs to evipedia's public suggestion form (Formspree); override its target with `EVIPEDIA_SUGGEST_ENDPOINT`


## Public API Surface

Base URL: `https://evipedia.ai`

| Endpoint | Description |
|---|---|
| `GET /reviews.json` | Full catalogue: `canonical_name`, `alternate_names[]`, `permalink`, `permalink_md`, `category`, `creation_date`, `er_conclusion` |
| `GET /search.json` | Search index: `short_topic`, `alternate_names`, `ep_keywords`, `ep_category`, `url` |
| `GET /{permalink}.md` | Complete review as raw Markdown (frontmatter + full body) |
| `GET /llms.txt` | Agent/human signpost — includes the stable section anchor list |
| `GET /sitemap.xml` | Canonical review URLs |
| `GET /feed.xml` | RSS feed of latest updates |

Notes:
* `search.json.url` gives the review slug (`/{permalink}`) used by `/{permalink}.md`. `short_topic` is a display label whose casing is inconsistent, so it is **not** a reliable slug — join `search.json` to `reviews.json` on the `url` slug, not on `short_topic`.
* Field-shape gotcha: `alternate_names` is a comma-separated **string** in `search.json` but a **`string[]` array** in `reviews.json`; `ep_keywords` may be `null`.
* Every review shares 22 fixed section headings with stable kramdown anchors (e.g. `/{permalink}_er#conclusion`); the canonical heading→anchor list is in `/llms.txt`
* Production indexes exclude `ep_visible: false` reviews (e.g. `peptide`, `psychedelics` categories) — the MCP surfaces only publicly visible reviews


## License

MIT — this covers the server code. Evipedia content is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (© Forever Healthy Foundation).
