// @ts-check
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
 * That file is how you tell GitHub Pages to use a custom domain, so it is
 * already the real signal, and reading it here means the two can never
 * disagree. Add the file and the build moves to the domain root; delete it
 * and the build goes back to the project-site subfolder. There is no second
 * value to remember to change, which is exactly the mistake this avoids.
 *
 * To move to the custom domain:
 *   1. Point the DNS at GitHub Pages (see README).
 *   2. echo bubblotics.ca > public/CNAME
 *   3. Commit. That is the whole switch.
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
