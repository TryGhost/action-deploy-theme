<p align="center">
  <a href="https://ghost.org">
    <img src="https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png" width="200px" alt="Ghost" />
  </a>
</p>
<h3 align="center">Deploy your Ghost Theme from GitHub</h3>
<p align="center">
    <a href="https://github.com/marketplace/actions/deploy-ghost-theme">
        <img src="https://img.shields.io/badge/view-action-blue.svg" alt="View Action" />
    </a>
    <a href="https://github.com/TryGhost/action-deploy-theme/contributors/">
        <img src="https://img.shields.io/github/contributors/TryGhost/action-deploy-theme.svg" alt="Contributors" />
    </a>
    <a href="https://github.com/tryghost/action-deploy-theme/issues">
        <img src="https://img.shields.io/github/issues/tryghost/action-deploy-theme.svg" alt="Issues" />
    </a>
    <a href="https://opencollective.com/ghost">
        <img src="https://opencollective.com/ghost/backers/badge.svg" alt="OpenCollective" />
    </a>
</p>

<p align="center">
    This <a href="https://github.com/features/actions">GitHub Action</a> packages and deploys your <a href="https://docs.ghost.org/themes/">Ghost theme</a> <br>from GitHub to a <a href="https://ghost.org">Ghost</a> site through the Ghost Admin API.
</p>

<p align="center">
    <img src="https://user-images.githubusercontent.com/120485/67154934-747e7300-f32e-11e9-9448-586a171c5169.png" />
</p>

<p align="center">
    <img src="https://user-images.githubusercontent.com/120485/66710712-20ace080-eda8-11e9-8559-7f0c3fd96651.png" />
</p>

---

&nbsp;

## Getting Started

1. Generate a set of Ghost Admin API credentials, by configuring a new Custom Integration in Ghost Admin &rarr; Integrations.

2. On GitHub, navigate to your theme repository &rarr; Settings &rarr; Secrets and variables &rarr; Actions. Create a secret called `GHOST_ADMIN_API_URL` containing the API URL and another one called `GHOST_ADMIN_API_KEY` containing the Admin API Key. Both must be copied exactly from Ghost Admin &rarr; Integrations.

3. Once your secrets are in place, copy this example config into `.github/workflows/deploy-theme.yml`. Then commit and push your changes:

```yml
name: Deploy Theme
on:
    push:
        branches:
            - master
            - main
jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v7
            - name: Deploy Ghost Theme
              uses: TryGhost/action-deploy-theme@v2
              with:
                  api-url: ${{ secrets.GHOST_ADMIN_API_URL }}
                  api-key: ${{ secrets.GHOST_ADMIN_API_KEY }}
```

This workflow deploys the theme after every push to `master` or `main`. To use a different trigger, see GitHub's [workflow trigger documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Configuration

The `with` section must provide the API URL and key. Store both values under the repository's **Settings &rarr; Secrets and variables &rarr; Actions**, then reference them with the `secrets` context as shown above. See GitHub's guide to [using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

| Key                 | Value Information                                                                                                                                                                                                     | Type     | Required |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| `api-url`           | The base URL of your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin &rarr; Integrations                                                                                                | `string` | **Yes**  |
| `api-key`           | The authentication key for your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin &rarr; Integrations                                                                                     | `string` | **Yes**  |
| `version`           | The [minimum Ghost Admin API version](https://docs.ghost.org/admin-api/#accept-version-header) the action expects the target site to support. Defaults to `v6.0`                                                      | `string` | No       |
| `exclude`           | A space-separated list of files and folders to exclude from the generated zip file in addition to the [defaults](https://github.com/TryGhost/action-deploy-theme/blob/main/src/main.ts), e.g. `"gulpfile.js *dist/*"` | `string` | No       |
| `theme-name`        | A custom theme name that overrides the default name in package.json. Useful if you use a fork of Casper, e.g. `"my-theme"`                                                                                            | `string` | No       |
| `file`              | Path to a built zip file. If this is included, the `exclude` and `theme-name` options are ignored                                                                                                                     | `string` | No       |
| `working-directory` | A custom directory to zip when a theme is in a subdirectory, e.g. `packages/my-theme`                                                                                                                                 | `string` | No       |

&nbsp;

:bulb: Use `exclude` to reduce the size of the zip file & keep deployment times minimal.

&nbsp;

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action!</p>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development, validation, and release commands.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
