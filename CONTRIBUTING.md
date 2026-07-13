# 🛠 Ghost Theme Deploy for GitHub Actions (DEV)

This guide covers local development, validation, and releases for the GitHub Action.

---

## Develop

Use Node.js 24 and the pnpm version declared in `package.json`:

```sh
corepack enable
pnpm install --frozen-lockfile
```

## Validate

- `pnpm lint` runs oxlint and checks formatting with oxfmt
- `pnpm lint:fix` fixes supported lint issues and reformats files
- `pnpm typecheck` runs the TypeScript compiler checks
- `pnpm build` bundles the action into `dist/` with ncc

GitHub Actions runs `dist/index.js`, so the built output is committed. For human-authored changes to the source or bundled dependencies, run `pnpm build` and commit the resulting `dist/` changes. Do not edit `dist/` by hand. CI verifies that the committed bundle matches the source.

Renovate pull requests are the exception: Renovate updates manifests without rebuilding `dist/`. After those changes reach `main`, the `sync-dist` workflow rebuilds and commits any bundle changes.

## Publish

- `pnpm ship patch` runs typecheck, lint and build, then bumps, commits, tags and pushes
- `pnpm ship minor` or `pnpm ship major` for larger version bumps
- `pnpm ship 2.1.0` for an explicit version

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action !</p>
