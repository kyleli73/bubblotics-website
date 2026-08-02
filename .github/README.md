# GitHub Actions

`workflows/deploy.yml` builds the site and publishes it to GitHub Pages on
every push to `main`. It is active and you should not need to touch it.

Live site: https://kyleli73.github.io/bubblotics-website/

## If a push is ever rejected with "without `workflow` scope"

GitHub refuses any push that creates or changes a file under
`.github/workflows/` unless the Personal Access Token has the **`workflow`**
scope, and it rejects the *whole* push, not just that one file. This caught
us once during setup, and it will catch the next person who makes a fresh
token.

Fix: go to https://github.com/settings/tokens, click the token, tick
**`workflow`** (leave `repo` ticked), and Update token. The token value does
not change, so nothing needs re-entering anywhere.

## If the site stops updating

Check the **Actions** tab. A red X means the build failed; click into the run
to see the error. The usual cause is a typo in the frontmatter block at the
top of a markdown file: a missing quote, a malformed date, or a tab where
spaces belong. The error names the file.

A failed build never replaces the live site, so a bad commit takes your
change offline, not the whole website.

## Pages settings

Repo → Settings → Pages → Source must stay on **GitHub Actions**. If someone
switches it to "Deploy from a branch", this workflow still runs but nothing
it produces gets published, and the site silently stops updating.
