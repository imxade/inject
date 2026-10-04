## Summary

Describe the native mechanism being exposed or changed.

## Boundary check

Explain why this belongs in the native abstraction layer rather than in a
consumer application.

## Verification

- [ ] `npm run check`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

## Checklist

- [ ] This PR is focused on one change.
- [ ] The PR title follows `type(scope): description`.
- [ ] The change exposes mechanism rather than application input policy.
- [ ] No key-name maps, gestures, controller layouts, or protocol semantics were added.
- [ ] Native resources are cleaned up on destroy/error paths where applicable.
- [ ] Platform-specific native libraries are loaded lazily.
