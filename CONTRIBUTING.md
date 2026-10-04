# Contributing

## Pull requests

Keep each pull request focused on one change. PR titles must use Conventional
Commit format because CI validates the title:

```text
type(scope): description
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, and `revert`.

Examples:

```text
feat(linux): add absolute pointer support
fix(windows): release synthetic pointer device
chore(deps): bump koffi
ci(deps): bump actions/checkout
```

Before opening a PR, run:

```sh
npm install
npm run check
npm run typecheck
npm test
npm run build
```

CI runs the same quality checks on Linux, macOS, and Windows. Dependency and
GitHub Actions updates opened by Dependabot use Conventional Commit prefixes so
they are subject to the same title and quality gates as contributor PRs.

## Scope

Keep this package focused on native input injection. Rein-specific networking,
WebRTC signalling, UI gesture handling, and server orchestration belong in Rein,
not in this library.
