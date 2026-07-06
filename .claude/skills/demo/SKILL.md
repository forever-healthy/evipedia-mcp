---
name: demo
description: Demonstrate the evipedia MCP server end-to-end — confirms the build is loaded and walks through every read tool (get_version, search_reviews, get_review, get_conclusion) against live evipedia.ai data, then explains the one write tool without invoking it. Use to smoke-test or show off the MCP.
version: 26.7.06
---

# evipedia-mcp — Demo the MCP (`/demo`)

Exercises the evipedia MCP server's tools live and narrates what each one does, so a viewer can see the server actually working against `https://evipedia.ai`. This is a demonstration/smoke-test, not a code test — it calls the real MCP tools that are connected in this session (the `mcp__evipedia__*` tools).

If the `mcp__evipedia__*` tools are not available in this session, stop and tell the user the evipedia MCP server isn't connected — nothing to demo. (Check `.mcp.json` and that the server was approved.)

Otherwise, run these steps in order and show the actual tool output for each, with a one-line explanation before each call.

1. **Which build is loaded** — call `get_version`. Report the package name and version it returns. This confirms the server is up and tells you whether it's the public (`evipedia-mcp`) or dev (`evipedia-mcp-dev`) build.

2. **Search** — call `search_reviews` with `query: "rapamycin"`. Show the matching review(s) and their permalinks. Then run one more search of the user's choice if they named a topic in the `/demo` args (e.g. `/demo creatine`); otherwise skip the second search.

3. **Full review** — take the top permalink from step 2 and call `get_review` on it. Don't dump the whole Markdown; show the first ~15 lines (frontmatter + opening) and note the total length, so the viewer sees it's the complete raw review.

4. **Conclusion only** — call `get_conclusion` on the same permalink. Show the plain-text conclusion. Point out this is the quick-answer path versus the full review in step 3.

5. **Write path (describe, do NOT call)** — explain that `suggest_intervention(intervention, goal?, references?, email?)` submits a new intervention to evipedia's public suggestion form. Do **not** invoke it during the demo — it POSTs real data to the evipedia team. Only call it if the user explicitly asks to submit a suggestion.

Close with a one-line summary: the server build from step 1, and that search → review → conclusion all returned live data.

**Arguments:** an optional topic (e.g. `/demo creatine`) used as the extra search in step 2 and, if it resolves to a review, as the permalink for steps 3–4 instead of rapamycin.
