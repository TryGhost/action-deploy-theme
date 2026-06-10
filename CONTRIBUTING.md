# 🛠 Ghost Theme Deploy for GitHub Actions (DEV)

This is a guide for developing and contributing to this GitHub Action. By installing and running this Action manually, you'll be able to control the environment variables that GitHub usually applies to the Action's container.

---

## Develop

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm install` to install top-level dependencies.

## Test

- `pnpm lint` run oxlint and check formatting with oxfmt
- `pnpm lint:fix` auto-fix lint issues and reformat
- `pnpm typecheck` run the TypeScript compiler checks
- `pnpm build` bundle the action into `dist/` with ncc

## Publish

- `pnpm ship` runs typecheck, lint & build, then bumps the patch version, tags and pushes
- `BUMP=minor pnpm ship` (or `BUMP=major`) for larger version bumps

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action !</p>
