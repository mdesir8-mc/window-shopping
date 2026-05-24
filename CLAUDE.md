## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## release automation

All commits and PR titles must follow Conventional Commits because semantic-release uses them to decide whether to create patch, minor, or major releases.

Allowed commit and PR title types:
- `fix:`
- `feat:`
- `feat!:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`

Use specific subjects, for example `fix: correct auth refresh` or `feat(api): add billing endpoint`.

Never use vague commit messages such as `updates`, `fix stuff`, or `changes`.

When opening PRs, use semantic PR titles because release automation depends on the final merged commit being semantic.
