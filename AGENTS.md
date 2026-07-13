# AGENTS.md

This is a Node.js 24 GitHub Action that packages and uploads Ghost themes; see [README.md](README.md) for usage.

- Use the pnpm version declared in `package.json`. Install with `pnpm install --frozen-lockfile`.
- Validate changes with `pnpm preship`; use `pnpm test` for a faster test-only run.
- The runner executes committed `dist/index.js`. Never edit `dist/` by hand; human-authored source or bundled dependency changes must include the output from `pnpm build`.
- Renovate pull requests are exempt from committing rebuilt `dist/`. The `sync-dist` workflow rebuilds the bundle on `main` after Renovate changes merge.
