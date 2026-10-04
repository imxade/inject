## Summary

Describe the change and why it belongs in the standalone input-injection library.

## Verification

- [ ] `npm run check`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

## Checklist

- [ ] This PR is focused on one change.
- [ ] The PR title follows `type(scope): description`.
- [ ] Platform-specific native code is not imported eagerly on unsupported operating systems.
- [ ] Native resources are cleaned up on destroy/error paths where applicable.
- [ ] No Rein-specific WebRTC, UI, or server concerns were added.
