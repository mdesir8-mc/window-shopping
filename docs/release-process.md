# Release Process

This repository uses Conventional Commits, semantic-release, GitHub Actions, and Railway deployment metadata. Humans and coding agents should not manually edit version numbers.

## Commit and PR title rules

Commits and PR titles must use Conventional Commits:

- `fix: repair login token bug` creates a patch release.
- `feat: add export endpoint` creates a minor release.
- `feat!: remove legacy auth API` creates a major release.
- `docs: update release notes`, `refactor: simplify item parser`, `test: cover parser fallback`, and `chore: update tooling` are accepted but do not release by default.

Invalid examples:

- `updated stuff`
- `fixes`
- `Codex window shopping updates`

Local commits are checked by Husky and commitlint. Pull request titles are checked by the `PR title` GitHub workflow.

## Release flow

1. A PR is merged into `main` with a semantic squash commit title.
2. The `Release` GitHub workflow installs dependencies, runs tests, and builds the frontend and server.
3. semantic-release analyzes commits since the latest `v*` tag.
4. When a release is warranted, semantic-release creates a Git tag, updates `CHANGELOG.md`, commits the changelog, and creates a GitHub Release.
5. The workflow records the released version, git SHA, and UTC release date.
6. Railway variables are updated with `APP_VERSION`, `GIT_SHA`, and `RELEASE_DATE`, then Railway deploys the exact commit.

GitHub repository settings should enable squash merge and configure default squash commit messages to use the PR title. Requiring the `PR title` check before merge keeps the final commit compatible with semantic-release.

## Version metadata

Production exposes unauthenticated release metadata at:

```text
GET /version
```

Response:

```json
{
  "version": "1.4.2",
  "sha": "abc123",
  "released_at": "2026-05-24T12:34:56Z"
}
```

Local development falls back to:

```json
{
  "version": "development",
  "sha": "local",
  "released_at": null
}
```

## Railway configuration

Add these GitHub repository secrets before relying on deployment:

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_SERVICE_ID`
- `RAILWAY_ENVIRONMENT`

The workflow uses the Railway CLI to set variables with `--skip-deploys`, then runs `railway up --ci` so one deployment includes the matching version metadata.

## Dry runs and forced releases

Preview release behavior locally with:

```bash
npm run release:dry-run
```

To force a release without code changes, merge an empty or documentation-only commit with a release-triggering type, for example:

```text
fix: trigger release
```

Use this sparingly. Prefer real user-facing changes to drive releases.

## Troubleshooting

- No release was created: confirm the merged commit on `main` starts with `fix:`, `feat:`, or includes a breaking-change marker such as `feat!:`.
- PR title check failed: rename the PR using an allowed Conventional Commit type.
- Railway did not deploy: confirm all Railway secrets exist and point at the intended project, service, and environment.
- `/version` shows fallback values in production: confirm the release workflow set Railway variables before deployment.
