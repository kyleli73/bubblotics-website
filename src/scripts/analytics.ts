/*
 * Click counts for GoatCounter.
 *
 * GoatCounter counts page views by itself (the script BaseLayout adds). It does
 * not know which button or link a visitor used, and this file supplies that.
 * Each tracked click is sent as an event. GoatCounter lists events by name,
 * next to the page views, so the most used links show up on the dashboard.
 *
 * One listener on the document, not one per element. Components are rendered
 * from many files, and a listener on each element would miss any added later.
 *
 * The listener runs in the capture phase. The header's dropdown buttons and
 * the side rail's toggle stop their clicks from bubbling, which would hide
 * them from a bubble-phase listener. Capture still sees them, and their own
 * behaviour is unchanged.
 */

declare global {
  interface Window {
    goatcounter?: {
      count: (vars: { path: string; title?: string; event?: boolean }) => void;
    };
  }
}

const TRACKED = 'a, button, summary';
const MAX_LABEL = 60;

/*
 * The name a click is filed under. An explicit data-track wins, so a label can
 * be written by hand. Otherwise it is the visible text, with whitespace
 * collapsed and capped. aria-label is the last resort for icon-only controls.
 */
function labelFor(el: Element): string {
  const explicit = el.getAttribute('data-track');
  if (explicit) return explicit.trim();

  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, MAX_LABEL);

  return (el.getAttribute('aria-label') ?? '').trim().slice(0, MAX_LABEL);
}

/* GoatCounter event paths are plain strings, so the label becomes a slug. */
function slug(label: string): string {
  return (
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unlabelled'
  );
}

function onClick(event: MouseEvent): void {
  // Nothing to count with when the script did not load (development, or a
  // blocker). Nothing to count on the team page, which opts out.
  if (!window.goatcounter) return;
  if (document.body.hasAttribute('data-no-analytics')) return;

  const target = event.target instanceof Element ? event.target : null;
  const el = target?.closest(TRACKED);
  // An opt-out on the element or any ancestor wins over everything else.
  if (!el || el.closest('[data-no-track]')) return;

  const label = labelFor(el) || 'unlabelled';
  let title = `${label} on ${location.pathname}`;
  if (
    el instanceof HTMLAnchorElement &&
    /^https?:$/.test(el.protocol) &&
    el.host !== location.host
  ) {
    title += ` to ${el.host}`;
  }

  window.goatcounter.count({
    path: `click/${slug(label)}`,
    title,
    event: true,
  });
}

document.addEventListener('click', onClick, { capture: true });

export {};
