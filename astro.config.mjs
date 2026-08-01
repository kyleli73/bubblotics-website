// @ts-check
import { defineConfig } from 'astro/config';

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE YOUR FIRST DEPLOY
 * ─────────────────────────────────────────────────────────────────────────
 *
 * GitHub Pages serves a repo at one of two kinds of URL, and Astro needs to
 * know which one so it can write correct links into the built HTML.
 *
 *   1. PROJECT SITE (the common case)
 *      https://<user>.github.io/<repo-name>/
 *      Every page lives under a subfolder, so `base` must be '/<repo-name>'.
 *
 *   2. USER SITE or CUSTOM DOMAIN
 *      https://<user>.github.io/   or   https://bubblotics.ca/
 *      Pages live at the root, so `base` must be '/'.
 *
 * Get this wrong and the site loads but every stylesheet, image, and link
 * 404s. It is the single most common GitHub Pages mistake.
 *
 * Set the two values below to match your repo, then commit.
 */

// [PLACEHOLDER] Change to your real Pages URL once you know it.
const SITE = 'https://bubblotics.github.io';

// [PLACEHOLDER] '/bubblotics-website' for a project site, '/' for a user site
// or custom domain. Must match your GitHub repo name exactly, including case.
const BASE = '/bubblotics-website';

export default defineConfig({
  site: SITE,
  base: BASE,

  // Emits /about/index.html instead of /about.html, so URLs have no extension
  // and a trailing slash works. Matches how GitHub Pages serves directories.
  build: {
    format: 'directory',
  },

  // Astro ships zero JavaScript unless a component asks for it. The only JS on
  // this site is the animation bundle in BaseLayout, which is deliberate.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
