// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';

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
