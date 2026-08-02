# Why the deploy workflow is not active yet

`deploy-workflow.yml` in this folder is the GitHub Actions pipeline that
builds the site and publishes it to GitHub Pages on every push to `main`.

It is sitting here rather than in `.github/workflows/` because **GitHub
refuses a push that creates or changes anything under `.github/workflows/`
unless the Personal Access Token doing the push has the `workflow` scope.**
The token used for the first push did not have it, and the whole push was
rejected because of this one file.

## Turning it on (about a minute)

1. Go to https://github.com/settings/tokens
2. Click the token you used to push.
3. Tick the **`workflow`** checkbox (leave `repo` ticked) and click
   **Update token**. The token value does not change, so nothing else
   needs re-entering.
4. Then, locally:

       cd "/Users/kyleli/Bubblotics Website"
       mkdir -p .github/workflows
       git mv .github/deploy-workflow.yml .github/workflows/deploy.yml
       git commit -m "Enable the GitHub Pages deploy workflow"
       git push

5. Finally, in the repo: **Settings → Pages → Source → GitHub Actions**.

From then on, every push to `main` rebuilds and republishes the site by
itself, and nobody needs Node installed to change a blog post: editing the
markdown on github.com is enough.

## Why this is worth doing

Without it, publishing means someone builds the site locally and commits the
output. That requires Node, a working `npm install`, and remembering to
rebuild. For a team that turns over every year, the workflow is the version
that survives.
