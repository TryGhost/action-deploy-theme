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
    This <a href="https://github.com/features/actions">GitHub action</a> allows you to automatically build and deploy your <a href="https://ghost.org/docs/api/handlebars-themes/">Ghost Theme</a> <br>from GitHub to any <a href="https://ghost.org">Ghost</a> install, via the Ghost Admin API!
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

💡This action expects that you already have a working Ghost install running at least v2.25.5.

1. Generate a set of Ghost Admin API credentials, by configuring a new Custom Integration in Ghost Admin&raquo;Integrations.

2. On GitHub, navigate to your theme repository&raquo;Settings&raquo;Secrets. Create a secret called `GHOST_ADMIN_API_URL` containing the API URL and another called `GHOST_ADMIN_API_KEY` containing the Admin API Key. Both must be copied exactly from Ghost Admin&raquo;Integrations.

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
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Ghost Theme
        uses: TryGhost/action-deploy-theme@v1
        with:
          api-url: ${{ secrets.GHOST_ADMIN_API_URL }}
          api-key: ${{ secrets.GHOST_ADMIN_API_KEY }}
```

This will trigger a deployment for every commit to master. If you'd like to change the "on" event, see the [GitHub action documentation](https://help.github.com/en/github/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#on), which shows how to build on Pull Requests, Releases, Tags and more.

## Configuration

The `with` portion of the workflow **must** be configured before the action will work. Any `secrets` must be referenced using the bracket syntax and stored in the GitHub repositories `Settings/Secrets` menu. You can learn more about setting environment variables with GitHub actions [here](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepsenv).

| Key  | Value Information | Type | Required |
| ------------- | ------------- | ------------- | ------------- |
| `api-url`  | The base URL of your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |
| `api-key`  | The authentication key for your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |
| `exclude` | A list of files & folders to exclude from the generated zip file in addition to the [defaults](https://github.com/TryGhost/action-deploy-theme/tree/main/index.js#L28), e.g. `"gulpfile.js *dist/*"` | `string` | No |
| `theme-name` | A custom theme name that overrides the default name in package.json. Useful if you use a fork of Casper, e.g. `"my-theme"` | `string` | No |
| `file` | Path to a built zip file. If this is included, the `exclude` and `theme-name` options are ignored | `string` | No |
| `working-directory` | A custom directory to zip when a theme is in a subdirectory, e.g. `packages/my-theme` | `string` | No |

&nbsp;

:bulb: Use `exclude` to reduce the size of the zip file & keep deployment times minimal.

&nbsp;

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action !</p>

# Copyright & License

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE).
