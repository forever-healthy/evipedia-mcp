# Evipedia MCP - Change Log


### v0.1.23 — 2026-07-16

* Made `search_reviews` (and the REST `GET /search`) **discovery-only**: they now return the matching reviews (name + URL, ranked by relevance) so you can tell whether a review exists, instead of embedding each match's full conclusion. Results are ~15× smaller for broad queries; read a specific review with `get_conclusion`/`get_review` (MCP) or `https://evipedia.ai/{slug}.md`

### v0.1.22 — 2026-07-16

* Hosted server ([`mcp.evipedia.ai`](https://mcp.evipedia.ai)): added permissive **CORS** headers (with `OPTIONS` preflight) so browser-based clients can call the REST `GET /search` and the `/mcp` endpoint cross-origin, and added lightweight **per-IP rate limiting** (default 60 requests/minute) to `/search` and `/mcp`. Health checks and the stdio package are unaffected

### v0.1.21 — 2026-07-16

* Rebuilt `search_reviews` (and the hosted `GET /search`) on **Lunr**, configured identically to the evipedia.ai homepage search — same fields, boosts, and ranking, so the MCP tool, the REST endpoint, and the website return consistent results. Fixes natural-language queries that previously returned nothing: e.g. "low-level light therapy for skin rejuvenation" now finds the Skin review, and "vitamin d" ranks Vitamin D first

### v0.1.18 — 2026-07-15

* Added a hosted **remote MCP server** over Streamable HTTP at [`https://mcp.evipedia.ai/mcp`](https://mcp.evipedia.ai/mcp) — web-based and non-terminal MCP clients can connect with just a URL, no local Node/`npx` install needed. It serves the same read + suggest tools as the stdio package

### v0.1.15 — 2026-07-12

* Removed the internal env-var overrides (`EVIPEDIA_BASE_URL`, `EVIPEDIA_SUGGEST_ENDPOINT`) from the MCP Registry listing — they are optional dev-only knobs users never need to set
* Restructured the README headings (Tools, Install, Try it, Architecture › Public API Surface) and simplified the example config to bare `evipedia-mcp` (no `@latest` — `npx` already resolves the latest version)

### v0.1.14 — 2026-07-12

* Enriched the MCP Registry listing with a display title (“Evipedia”), `websiteUrl`, and icons (SVG + 192/512 px PNG served from evipedia.ai)

### v0.1.13 — 2026-07-12

* Published to the official [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.forever-healthy/evipedia-mcp`, so MCP-aware clients can discover and install the server automatically

### v0.1.12 — 2026-07-12

* Added `get_metadata` — structured medical metadata as JSON (review dates `datePublished`/`dateModified`/`lastReviewed`, the typed `about` entity with alternate names, and an ordered `citation` list with PubMed PMIDs), sourced from evipedia's `/{slug}.meta.json` endpoint — data not present in the raw Markdown
* Documented that `get_review`/`get_conclusion` accept a slug or a full evipedia.ai URL, and that `search_reviews` returns each match's URL and conclusion
* Collapsed the duplicate MCP client config blocks in the README into one

### v0.1.10 — 2026-07-10

* Standardized the review identifier on `slug` across all tools — `get_review` and `get_conclusion` now take a `slug` parameter (was `permalink`), matching what `list_reviews` returns (a full evipedia.ai URL is still accepted)

### v0.1.9 — 2026-07-10

* Added `list_reviews` — enumerate the full catalogue as `{topic, slug}` pairs (bare topic implies the default Health & Longevity goal)
* Added server-level instructions so a connecting agent learns what evipedia is, when to use it, and the discover → read → contribute workflow
* Ordered the tools to follow that workflow (search → list → conclusion → review → suggest → version)

### v0.1.0 — 2026-07-06

* 1st public release
