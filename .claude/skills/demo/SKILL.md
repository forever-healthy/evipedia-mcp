---
name: demo
description: Demonstrate the evipedia MCP server end-to-end — confirms the build is loaded, shows the server-level instructions the model received on connect, walks through every read tool (get_version, search_reviews, list_reviews, get_review, get_conclusion, get_metadata) against live evipedia.ai data, then explains the one write tool without invoking it. Use to smoke-test or show off the MCP.
version: 26.7.06
---

# evipedia-mcp — Demo the MCP (`/demo`)

Exercises the evipedia MCP server's tools live and narrates what each one does, so a viewer can see the server actually working against `https://evipedia.ai`. This is a demonstration/smoke-test, not a code test — it calls the real MCP tools that are connected in this session (the `mcp__evipedia__*` tools).

If the `mcp__evipedia__*` tools are not available in this session, stop and tell the user the evipedia MCP server isn't connected — nothing to demo. (Check `.mcp.json` and that the server was approved.)

Otherwise, run these steps in order and show the actual tool output for each, with a one-line explanation before each call.

1. **Which build is loaded** — call `get_version`. Report the package name and version it returns. This confirms the server is up and tells you whether it's the public (`evipedia-mcp`) or dev (`evipedia-mcp-dev`) build.

2. **What the server told the model** — show the evipedia server's **server-level instructions**: the overview block the MCP sends at connect (its `instructions` field), which is what the model reads before using any tool. You already have it in context as this session's evipedia "MCP Server Instructions" — quote or tightly summarize it, pointing out that it explains what evipedia is, when to reach for it, and the discover → read → contribute workflow. This proves the server is self-describing, not just a bag of tools. If no evipedia server instructions are present in context, say so plainly — that means the connected build predates them (an old server), which is itself a useful smoke-test signal.

3. **Search** — call `search_reviews` with `query: "rapamycin"`. Show the matching review(s) and their URLs. Then run one more search of the user's choice if they named a topic in the `/demo` args (e.g. `/demo creatine`); otherwise skip the second search.

4. **Full catalogue** — call `list_reviews` (no arguments). It returns every review as a `{topic, slug}` pair (canonical topic + the slug you pass to `get_review`/`get_conclusion`). Don't dump all of it; report the total count and show the first 3 entries, so the viewer sees the whole catalogue is enumerable in one call.

5. **Conclusion only** — take the top review's slug from step 3 (e.g. `rapamycin`) and call `get_conclusion` on it. Show the plain-text conclusion. Point out this is the quick-answer path versus the full review in step 6.

6. **Full review** — call `get_review` on the same slug. Don't dump the whole Markdown; show the first ~15 lines (frontmatter + opening) and note the total length, so the viewer sees it's the complete raw review.

7. **Structured metadata** — call `get_metadata` on the same slug. Show the returned JSON and point out the fields the Markdown lacks: the review dates (`datePublished`/`dateModified`/`lastReviewed` — a freshness signal), the typed `about` entity with alternate names, and the ordered `citation` list with PubMed PMIDs.

8. **Write path (describe, do NOT call)** — explain that `suggest_intervention(intervention, goal?, references?, email?)` submits a new intervention to evipedia's public suggestion form. Do **not** invoke it during the demo — it POSTs real data to the evipedia team. Only call it if the user explicitly asks to submit a suggestion.

Close with a one-line summary: the server build from step 1, that the server-level instructions were present, and that search → list → conclusion → review → metadata all returned live data.

**Arguments:** an optional topic (e.g. `/demo creatine`) used as the extra search in step 3 and, if it resolves to a review, as the slug for steps 5–7 instead of rapamycin.
