/*
 * Type-checking is off for this one file.
 *
 * It legitimately uses Node built-ins (node:fs, process), and checking them
 * needs @types/node, which is a dependency this project does not otherwise
 * want. With `// @ts-check` on, `npm run check` reported two errors here on
 * a clean checkout, which trains people to ignore the checker. Everything
 * in src/ is still fully checked.
 */
// @ts-nocheck
import { defineConfig, passthroughImageService } from 'astro/config';

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  WHERE THE SITE LIVES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * GitHub Pages serves a repo at one of two kinds of URL, and Astro has to
 * know which, so it can write correct links into the built HTML:
 *
 *   1. PROJECT SITE      https://kyleli73.github.io/bubblotics-website/
 *      Everything sits under a subfolder, so `base` must be the repo name.
 *
 *   2. CUSTOM DOMAIN     https://bubblotics.ca/
 *      Everything sits at the root, so `base` must be '/'.
 *
 * Get it wrong and the site loads but every stylesheet, image and link
 * 404s. It is the most common GitHub Pages mistake there is.
 *
 * ── This is decided automatically ──────────────────────────────────────
 * The switch is the presence of public/CNAME.
 *
 * Add the file and the build moves to the domain root; delete it and the
 * build goes back to the project-site subfolder. One value, in one place.
 *
 * IMPORTANT, AND EASY TO GET WRONG: this file does NOT configure GitHub
 * Pages. That is true when Pages publishes from a branch, but this repo
 * publishes from a GitHub Actions workflow, and GitHub's docs are explicit
 * that in that case "any existing CNAME file is ignored and is not
 * required". The domain has to be set by hand in Settings -> Pages ->
 * Custom domain. Here the file is purely this build's own switch.
 *
 * To move to a custom domain:
 *   1. Point the DNS at GitHub Pages (see README).
 *   2. Set the domain in Settings -> Pages -> Custom domain.
 *   3. echo yourdomain > public/CNAME and commit, so the build agrees.
 */

import { existsSync, readFileSync } from 'node:fs';

const CNAME_PATH = new URL('./public/CNAME', import.meta.url);

const customDomain = existsSync(CNAME_PATH)
  ? readFileSync(CNAME_PATH, 'utf8').trim().split(/\s+/)[0]
  : null;

const SITE = customDomain
  ? `https://${customDomain}`
  : 'https://kyleli73.github.io';

const BASE = customDomain ? '/' : '/bubblotics-website';

export default defineConfig({
  site: SITE,
  base: BASE,

  // Emits /about/index.html instead of /about.html, so URLs have no extension
  // and a trailing slash works. Matches how GitHub Pages serves directories.
  build: {
    format: 'directory',
  },

  /*
   * ── Image processing ─────────────────────────────────────────────────
   * By default Astro uses Sharp to resize images, convert them to WebP, and
   * generate the 2x versions for Retina screens. That is what keeps a
   * 2000px logo from being sent whole to a phone, and it is what you want
   * in production.
   *
   * Sharp ships a ~9 MB native binary. On a slow or unreliable connection
   * that download can fail partway and leave a truncated file, and the only
   * symptom is every image 404ing with "Could not find Sharp".
   *
   * So there is an escape hatch. Set NO_SHARP=1 and Astro serves images
   * untouched instead:
   *
   *     NO_SHARP=1 npm run dev
   *
   * The site works, images just aren't optimised, and the original file
   * size is what reaches the browser. Fine for building pages locally,
   * not something to deploy.
   *
   * The GitHub Actions build does NOT set this, so the published site
   * always gets fully optimised images regardless of whose laptop the
   * content was written on.
   */
  image: process.env.NO_SHARP ? { service: passthroughImageService() } : {},

  // Astro ships zero JavaScript unless a component asks for it. The only JS on
  // this site is the animation bundle in BaseLayout, which is deliberate.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
