---
name: demo
description: Show the evipedia MCP in action — searches evipedia.ai's evidence reviews of health & longevity interventions and answers from them, citing the review URL. Use to smoke-test or show off the MCP.
version: 0.1.18
---

# evipedia-mcp — Demo (`/demo`)

Use the **evipedia MCP** to answer an evidence question live.

Pick the intervention from the `/demo` argument (e.g. `/demo creatine`), or default to **rapamycin**. Then:

1. Search evipedia for it (`search_reviews`).
2. Answer from the review's conclusion, and cite its `https://evipedia.ai/{slug}` URL.
3. For more depth, read the full review (`get_review`) or its metadata/citations (`get_metadata`).

The server's own instructions describe the full tool set; just use whatever fits the question.
