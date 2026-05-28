# Agent Instructions

Do not call background or secondary agents unless the estimated task completion time exceeds 20 minutes.

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
