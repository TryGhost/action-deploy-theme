# Ghost Theme Deploy for GitHub Actions :rocket: 

[![Actions Status](https://github.com/tryghost/action-deploy-theme/workflows/integration/badge.svg)](https://github.com/tryghost/action-deploy-theme/actions) [![View Action](https://img.shields.io/badge/view-action-blue.svg)](https://github.com/marketplace/actions/deploy-to-github-pages) [![Issues](https://img.shields.io/github/issues/tryghost/action-deploy-theme.svg)](https://github.com/tryghost/action-deploy-theme/issues)

This [GitHub action](https://github.com/features/actions) handles the build and deploy process of your [Ghost Theme](https://ghost.org/docs/api/handlebars-themes/) to any [Ghost](https://ghost.org) instance, via API. This action is built on Node, so you can call any optional build scripts your theme requires prior to deploying.

<br>

<p align="center">
    <img src="https://user-images.githubusercontent.com/120485/66710712-20ace080-eda8-11e9-8559-7f0c3fd96651.png" />
</p>

---

&nbsp;


## Getting Started 

You can include the action in your workflow to trigger on any event that GitHub actions supports. If the remote branch that you wish to deploy to doesn't already exist the action will create it for you.

Here's an example:

```yml
name: Deploy Theme
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@master
      - uses: TryGhost/action-deploy-theme@v1.0.0
        with:
          api-url: ${{ secrets.GHOST_ADMIN_API_URL }}
          api-key: ${{ secrets.GHOST_ADMIN_API_KEY }}

```

If you'd like to make it so the workflow only triggers on push events to specific branches then you can modify the `on` section. You'll still need to specify a `BASE_BRANCH` if you're deploying from a branch other than `master`.

```yml
on:
  push:	
    branches:	
      - master
```

## Configuration

The `with` portion of the workflow **must** be configured before the action will work. Any `secrets` must be referenced using the bracket syntax and stored in the GitHub repositories `Settings/Secrets` menu. You can learn more about setting environment variables with GitHub actions [here](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepsenv).

| Key  | Value Information | Type | Required |
| ------------- | ------------- | ------------- | ------------- |
| `GHOST_ADMIN_API_URL`  | The base URL of your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |
| `GHOST_ADMIN_API_KEY`  | The authentication key for your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |

&nbsp;

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action !</p>
