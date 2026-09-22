/*
 * What visitors see, versus what the team sees while working on the site.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 * Anything still marked [PLACEHOLDER], and every note that names a file
 * path or points at the README, appears when you run the site on your own
 * machine (`npm run dev`) and is left out of the public build
 * (`npm run build`, which is what gets deployed).
 *
 * Why: the markers are genuinely useful while writing. They tell whoever is
 * editing exactly what is missing and where the file goes. On the public
 * site they were the least professional thing on it. A sponsor reading
 * "Drop photos into src/assets/gallery/" or "[PLACEHOLDER] Explain who is
 * eligible" learns that nobody finished the page, which is worse than the
 * section not being there at all.
 *
 * How to publish something: delete its [PLACEHOLDER] marker once the text is
 * real. It appears on the next build. Nothing else to switch on.
 *
 * `import.meta.env.DEV` is set by Astro: true under `npm run dev`, false in
 * a production build. It is replaced at build time, so the hidden content
 * is not merely styled away; it is never written into the deployed HTML.
 */

export const SHOW_UNFINISHED = import.meta.env.DEV;

const MARK = '[PLACEHOLDER]';

/** True if any of these strings still carries a [PLACEHOLDER] marker. */
export function isUnfinished(...texts: unknown[]): boolean {
  return texts.some((t) => typeof t === 'string' && t.includes(MARK));
}

/** Show this item? Always locally; in production only once it is finished. */
export function publishable(...texts: unknown[]): boolean {
  return SHOW_UNFINISHED || !isUnfinished(...texts);
}

/*
 * Collection filter for blog posts. A post goes live when it is not a draft
 * and nothing in its front matter or body is still a placeholder. A post
 * that is half written stays off the public site until it is done, rather
 * than being published with instructions in it.
 */
export function isLivePost(entry: {
  data: Record<string, unknown>;
  body?: string;
}): boolean {
  if (entry.data.draft) return false;
  return publishable(entry.body, ...Object.values(entry.data));
}
