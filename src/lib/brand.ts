/*
 * Finds the team logo, if it has been added yet.
 *
 * ── HOW TO ADD THE REAL LOGO ────────────────────────────────────────────
 * Save the logo file as:
 *
 *     src/assets/brand/logo.png
 *
 * (.svg, .webp, .jpg, and .avif all work too. SVG is best if you have it,
 * because it stays sharp at any size.)
 *
 * That is the entire process. The header, the footer, and the browser tab
 * icon all switch over to it on the next save. There is no list to update
 * and no other file to touch.
 *
 * Until that file exists, a placeholder mark is used instead, so the site
 * never renders a broken image.
 *
 * ── WHY IT WORKS THIS WAY ───────────────────────────────────────────────
 * `import.meta.glob` asks the build tool, at build time, "does anything
 * match this pattern?" With `eager: true` it hands back the actual imported
 * file rather than a function to load it later. If nothing matches it
 * returns an empty object, which is what makes the fallback possible.
 *
 * The file goes in src/assets/ rather than public/ because Astro processes
 * anything in src/assets: a 2000px logo gets automatically resized down to
 * the ~50px the header actually displays. Dropped in public/ instead, every
 * visitor would download the full-size original just to render it the size
 * of a thumbnail.
 */

const matches = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/brand/logo.{png,jpg,jpeg,svg,webp,avif}',
  { eager: true }
);

/*
 * If more than one logo.* somehow ends up in the folder, prefer the best
 * format rather than whichever the glob happened to list first. Relying on
 * glob order would mean a stray logo.png silently beating the SVG, and the
 * only symptom would be a slightly softer logo that nobody thinks to
 * investigate.
 */
const PREFERENCE = ['.svg', '.avif', '.webp', '.png', '.jpg', '.jpeg'];

const found = Object.entries(matches)
  .sort(([a], [b]) => {
    const rank = (p: string) => {
      const i = PREFERENCE.findIndex((ext) => p.toLowerCase().endsWith(ext));
      return i === -1 ? PREFERENCE.length : i;
    };
    return rank(a) - rank(b);
  })
  .map(([, mod]) => mod.default)[0];

/** The logo, or undefined if it has not been added yet. */
export const logo: ImageMetadata | undefined = found;

/** True when the real logo is in place. */
export const hasLogo = Boolean(found);

/*
 * Astro's <Image> component processes raster formats (resizing, converting
 * to modern formats, generating srcset). SVG is already resolution
 * independent, so it is passed through as a plain <img> instead.
 */
export const logoIsVector = found?.format === 'svg';
