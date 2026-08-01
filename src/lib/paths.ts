/*
 * Base-aware URL helper.
 *
 * On GitHub Pages a project site lives under a subfolder
 * (bubblotics.github.io/bubblotics-website/), so a link written as "/about/"
 * points at the wrong place: it resolves to the domain root, not the repo.
 *
 * `url()` prefixes whatever `base` is set to in astro.config.mjs. Use it for
 * every internal link and every reference to a file in public/. Get in the
 * habit and the site works identically at the root, in a subfolder, and on a
 * custom domain with no edits.
 *
 *   <a href={url('/robots/')}>          not  <a href="/robots/">
 *   <img src={url('/images/x.jpg')} />  not  <img src="/images/x.jpg" />
 *
 * Images imported from src/assets/ are handled by Astro itself and do NOT
 * need this.
 */

const base = import.meta.env.BASE_URL; // '/' or '/repo-name/', set by Astro

export function url(path: string): string {
  // Join without doubling or dropping a slash, whatever `base` ends with.
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/*
 * True when `href` is the page currently being rendered. Used to mark the
 * active nav item, both visually and with aria-current for screen readers.
 */
export function isActive(href: string, currentPath: string): boolean {
  const strip = (p: string) => {
    const withoutBase = p.startsWith(base) ? p.slice(base.length - 1) : p;
    return withoutBase.replace(/\/+$/, '') || '/';
  };

  const target = strip(href);
  const current = strip(currentPath);

  if (target === '/') return current === '/';

  // A robot detail page should light up the "Robots" nav item too.
  return current === target || current.startsWith(`${target}/`);
}

/* Formats a date the way the site displays them everywhere. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', // dates in frontmatter have no time; UTC avoids off-by-one
  });
}
