<p align="center">
  <a href="https://ghost.org">
    <img src="https://user-images.githubusercontent.com/120485/43974508-b64b2fe8-9cd2-11e8-8e58-707254b8817c.png" width="140px" alt="Ghost" />
  </a>
</p>
<h3 align="center">Deploy your Ghost Theme from Github</h3>
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
    This <a href="https://github.com/features/actions">GitHub action</a> allows you to automatically build and deploy your <a href="https://ghost.org/docs/api/handlebars-themes/">Ghost Theme</a> from Github<br>to any [Ghost](https://ghost.org) install, via the Ghost Admin API!
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
      - uses: TryGhost/action-deploy-theme@v1.1.0
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
| `api-url`  | The base URL of your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |
| `api-key`  | The authentication key for your Ghost Admin API, found by configuring a new Custom Integration in Ghost Admin&raquo;Integrations | `secrets` | **Yes** |
| `exclude` | A list of files & folders to exclude from the generated zip file in addition to the defaults, e.g. `"gulpfile.js *dist/*"` | `string` | No |

&nbsp;

:bulb: Use `exclude` to reduce the size of the zip file & keep deployment times minimal.

&nbsp;

---

<p align="center">Don't forget to 🌟 Star 🌟 the repo if you like this GitHub Action !</p>
