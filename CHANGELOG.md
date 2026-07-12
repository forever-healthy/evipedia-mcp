# Evipedia MCP - Change Log


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
