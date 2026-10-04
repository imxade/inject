# Contributing

## Architecture rule

Inject is a native mechanism layer, not an input-policy layer.

Contributions may expose operating-system input facilities, native device
creation, raw event submission, FFI structures, capability configuration, and
resource lifecycle.

Do not add application semantics such as key-name maps, text conversion,
shortcuts, gesture recognition, sensitivity/acceleration, scroll policy,
controller layouts, protocol messages, validation, or throttling.

The consuming application must retain complete control over which native codes,
flags, coordinates, reports, and event sequences are submitted.

## Pull requests

Keep each pull request focused on one change. PR titles must use Conventional
Commit format because CI validates the title:

```text
type(scope): description
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, and `revert`.

Before opening a PR, run:

```sh
npm install
npm run check
npm run typecheck
npm test
npm run build
```

CI runs the same quality checks on Linux, macOS, and Windows. Dependabot PRs
must pass the same checks and title gate as contributor PRs.
