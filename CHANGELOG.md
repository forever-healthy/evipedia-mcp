# Evipedia MCP - Change Log


### v0.1.10 — 2026-07-10

* Standardized the review identifier on `slug` across all tools — `get_review` and `get_conclusion` now take a `slug` parameter (was `permalink`), matching what `list_reviews` returns (a full evipedia.ai URL is still accepted)

### v0.1.9 — 2026-07-10

* Added `list_reviews` — enumerate the full catalogue as `{topic, slug}` pairs (bare topic implies the default Health & Longevity goal)
* Added server-level instructions so a connecting agent learns what evipedia is, when to use it, and the discover → read → contribute workflow
* Ordered the tools to follow that workflow (search → list → conclusion → review → suggest → version)

### v0.1.0 — 2026-07-06

* 1st public release
