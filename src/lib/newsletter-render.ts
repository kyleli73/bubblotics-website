/*
 * Turns an issue's stored HTML into the article a reader sees.
 *
 * The HTML was converted from the team's Word file in the browser and then
 * stored in Supabase. It is never trusted. Every time an issue is shown it goes
 * through DOMPurify with an allowlist of tags and attributes, and an image is
 * kept only when it comes from this project's photo bucket. The team preview
 * uses the same function, with photos that are still local object URLs.
 *
 * DOMPurify returns a DOM fragment rather than a string, and the fragment is
 * appended with DOM calls. Nothing is ever assigned to innerHTML.
 */

import DOMPurify, { type DOMPurify as Purifier } from 'dompurify';
import { PHOTO_PREFIX } from './newsletter';

export type RenderOptions = {
  /**
   * Preview only. Maps each placeholder the converter wrote (nlimg:0, nlimg:1,
   * ...) to a local object URL. Anything not in the map is dropped.
   */
  previewImages?: Map<string, string>;
};

const ALLOWED_TAGS = [
  'p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's', 'sub', 'sup', 'a',
  'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'hr',
];

// Attributes not listed here, including class, id, style and every data-*,
// are removed. The article's own classes are added after sanitising, so the
// stored HTML can never choose its own layout.
const ALLOWED_ATTR = ['href', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'];

// DOMPurify runs every attribute value through this, not only URLs, so it has
// to let plain values like a width of "10" through as well. It is DOMPurify's
// own default with blob: added for the preview's photos. javascript: and data:
// still fail it. Links are narrowed further by isSafeLink, and photos by
// photoSource.
const ALLOWED_URI = /^(?:(?:(?:f|ht)tps?|mailto|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const ELEMENT = 1;

function isElement(node: ChildNode): node is Element {
  return node.nodeType === ELEMENT;
}

/*
 * A link may open a web page or start an email. javascript:, data: and
 * relative links are refused. new URL() throws on a relative link, which is
 * the outcome wanted here.
 */
function isSafeLink(href: string): boolean {
  try {
    const { protocol } = new URL(href);
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

/*
 * The address an image should load from, or null to drop it. Public pages
 * accept only the project's own bucket. The preview accepts only the
 * placeholders it was given, and swaps each one for its object URL.
 */
function photoSource(value: string, previewImages: Map<string, string> | undefined): string | null {
  if (previewImages) return previewImages.get(value) ?? null;
  return value.startsWith(PHOTO_PREFIX) ? value : null;
}

export function renderIssue(html: string, options: RenderOptions = {}): HTMLElement {
  const previewImages = options.previewImages;

  // A purifier made for this one call. Its hooks cannot reach any other
  // DOMPurify user on the page, and the preview and the public page each get
  // their own rules.
  const purifier: Purifier = DOMPurify();
  purifier.addHook('uponSanitizeAttribute', (node, data) => {
    if (node.nodeName === 'A' && data.attrName === 'href') {
      if (!isSafeLink(data.attrValue)) data.keepAttr = false;
    } else if (node.nodeName === 'IMG' && data.attrName === 'src') {
      const source = photoSource(data.attrValue, previewImages);
      if (source === null) data.keepAttr = false;
      else data.attrValue = source;
    }
  });
  purifier.addHook('afterSanitizeAttributes', (node) => {
    // Set after the attribute pass, so these survive it. Links to other sites
    // open in a new tab and do not hand the new page a handle back to this one.
    if (node.nodeName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.nodeName === 'IMG') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    }
  });

  const fragment = purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    // DOMPurify keeps data-* attributes unless told otherwise.
    ALLOW_DATA_ATTR: false,
  }) as DocumentFragment;

  const article = document.createElement('div');
  article.className = 'nl-article';
  article.append(fragment);

  // Order matters. Empty paragraphs go first, so a caption is the next real
  // paragraph after its photo. Figures are made before galleries group them.
  removeImagesWithoutSource(article);
  unwrapLinksWithoutHref(article);
  removeEmptyParagraphs(article);
  unwrapHeadingEmphasis(article);
  unwrapCellParagraphs(article);
  tidyTables(article);
  wrapPhotos(article);
  groupGalleries(article);
  wirePhotos(article);
  return article;
}

/* ── Tidying the sanitised tree ───────────────────────────────────────── */

/*
 * An image the sanitiser refused loses its src. Without one it would show a
 * broken-picture icon, so it goes entirely.
 */
function removeImagesWithoutSource(root: Element): void {
  for (const img of Array.from(root.querySelectorAll('img'))) {
    if (!img.hasAttribute('src')) img.remove();
  }
}

/*
 * Word puts an invisible anchor on each bookmark. With its id removed, it is
 * an empty link that does nothing, so the text inside is kept and the link goes.
 */
function unwrapLinksWithoutHref(root: Element): void {
  for (const link of Array.from(root.querySelectorAll('a'))) {
    if (!link.hasAttribute('href')) link.replaceWith(...Array.from(link.childNodes));
  }
}

function removeEmptyParagraphs(root: Element): void {
  for (const paragraph of Array.from(root.querySelectorAll('p'))) {
    // A paragraph holding only a line break has no text and no photo, so it
    // is removed along with the truly empty ones.
    if (!paragraph.textContent?.trim() && !paragraph.querySelector('img')) {
      paragraph.remove();
    }
  }
}

/*
 * A heading that is only one bold or italic run is already styled by the
 * heading. The inner tag is removed so the heading does not double up.
 */
function unwrapHeadingEmphasis(root: Element): void {
  for (const heading of Array.from(root.querySelectorAll('h2, h3, h4'))) {
    const only = significantChildren(heading);
    if (only.length !== 1) continue;
    const [child] = only;
    if (isElement(child) && ['STRONG', 'EM', 'U'].includes(child.nodeName)) {
      heading.replaceChildren(...Array.from(child.childNodes));
    }
  }
}

/* A cell holding a single paragraph does not need the paragraph's margins. */
function unwrapCellParagraphs(root: Element): void {
  for (const cell of Array.from(root.querySelectorAll('td, th'))) {
    const only = significantChildren(cell);
    const [sole] = only;
    if (only.length === 1 && isElement(sole) && sole.nodeName === 'P') {
      sole.replaceWith(...Array.from(sole.childNodes));
    }
  }
}

/*
 * Word tables come out with every row inside thead, and the cells in those
 * rows all marked as headers. The first row becomes the real header when every
 * one of its cells is bold, which is how the team marks a header in the doc.
 * The rest become ordinary body rows.
 */
function tidyTables(root: Element): void {
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const rows = Array.from(table.rows);
    if (rows.length > 0 && isBoldHeaderRow(rows[0])) {
      const [headRow, ...bodyRows] = rows;
      for (const cell of Array.from(headRow.cells)) {
        unwrapInside(cell, 'strong');
        retag(cell, 'TH');
      }
      const body = table.ownerDocument.createElement('tbody');
      for (const row of bodyRows) {
        for (const cell of Array.from(row.cells)) retag(cell, 'TD');
        body.append(row);
      }
      const head = table.ownerDocument.createElement('thead');
      head.append(headRow);
      table.replaceChildren(head, body);
    }

    // The wrapper is what scrolls sideways on a phone. The table itself keeps
    // its natural width.
    const wrap = table.ownerDocument.createElement('div');
    wrap.className = 'nl-table-wrap';
    table.replaceWith(wrap);
    wrap.append(table);
  }
}

function isBoldHeaderRow(row: HTMLTableRowElement): boolean {
  const cells = Array.from(row.cells);
  return cells.length > 0 && cells.every((cell) => hasText(cell) && allTextWithin(cell, 'strong'));
}

function retag(cell: Element, tag: 'TH' | 'TD'): void {
  if (cell.nodeName === tag) return;
  const replacement = cell.ownerDocument.createElement(tag.toLowerCase());
  for (const attr of Array.from(cell.attributes)) {
    replacement.setAttribute(attr.name, attr.value);
  }
  replacement.append(...Array.from(cell.childNodes));
  cell.replaceWith(replacement);
}

/*
 * A paragraph that holds nothing but one photo becomes a figure. If the next
 * paragraph is all italic and short, it becomes the figure's caption. That is
 * how the team writes captions in the Word file.
 */
function wrapPhotos(root: Element): void {
  for (const paragraph of Array.from(root.querySelectorAll('p'))) {
    const only = significantChildren(paragraph);
    const [sole] = only;
    if (only.length !== 1 || !isElement(sole) || sole.nodeName !== 'IMG') continue;

    const img = sole;
    const next = paragraph.nextElementSibling;
    const figure = root.ownerDocument.createElement('figure');
    figure.append(img);
    paragraph.replaceWith(figure);

    if (next && next.nodeName === 'P' && isItalicCaption(next)) {
      const text = normalise(next.textContent ?? '');
      if (text.length <= 200) {
        const caption = root.ownerDocument.createElement('figcaption');
        caption.textContent = text;
        figure.append(caption);
        if (!img.getAttribute('alt')) img.setAttribute('alt', text);
        next.remove();
      }
    }
  }
}

/* Two or more figures side by side in the same run become one grid. */
function groupGalleries(root: Element): void {
  const parents = new Set(
    Array.from(root.querySelectorAll('figure')).map((figure) => figure.parentElement)
  );
  for (const parent of parents) {
    if (!parent) continue;
    let run: Element[] = [];
    const flush = () => {
      if (run.length >= 2) {
        const gallery = root.ownerDocument.createElement('div');
        gallery.className = 'nl-gallery';
        run[0].before(gallery);
        gallery.append(...run);
      }
      run = [];
    };
    for (const child of Array.from(parent.children)) {
      if (child.nodeName === 'FIGURE') run.push(child);
      else flush();
    }
    flush();
  }
}

/* ── Photos and the enlarged view ─────────────────────────────────────── */

let lightbox: HTMLDialogElement | undefined;
let photoToReturnTo: HTMLElement | null = null;

/*
 * A photo can be opened by a click or by Enter and Space, so it is focusable.
 * The enlarged view is one native dialog, shared by every photo on the page.
 * Escape and a click anywhere close it, and focus goes back to the photo.
 */
function wirePhotos(root: Element): void {
  for (const img of Array.from(root.querySelectorAll('img'))) {
    img.tabIndex = 0;
    img.setAttribute('aria-haspopup', 'dialog');
    img.addEventListener('click', () => openPhoto(img));
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPhoto(img);
      }
    });
  }
}

function openPhoto(img: HTMLImageElement): void {
  if (!lightbox) {
    lightbox = document.createElement('dialog');
    lightbox.className = 'nl-lightbox';

    const picture = document.createElement('img');
    picture.className = 'nl-lightbox-image';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'nl-lightbox-close';
    close.textContent = 'Close';

    lightbox.append(picture, close);
    // Clicking the photo, the close button or the backdrop all close it, since
    // the click bubbles up to the dialog in every case.
    lightbox.addEventListener('click', () => lightbox?.close());
    lightbox.addEventListener('close', () => {
      photoToReturnTo?.focus();
      photoToReturnTo = null;
    });
    document.body.append(lightbox);
  }

  const picture = lightbox.querySelector('img') as HTMLImageElement;
  picture.src = img.src;
  picture.alt = img.alt;
  photoToReturnTo = img;
  lightbox.showModal();
}

/* ── Shared helpers, also used by the converter ───────────────────────── */

export function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hasText(el: Element): boolean {
  return Boolean(el.textContent?.trim());
}

/*
 * True when every run of text inside `scope` sits inside an element matching
 * `tag` that is itself inside `scope`. A caption is "all italic" in this sense,
 * and so is a header cell "entirely bold".
 */
export function allTextWithin(scope: Element, tag: string): boolean {
  const walker = scope.ownerDocument.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const wrapper = node.parentElement?.closest(tag);
    if (!wrapper || !scope.contains(wrapper)) return false;
  }
  return true;
}

/* A paragraph of text that is entirely italic, with no photo in it. */
export function isItalicCaption(paragraph: Element): boolean {
  return hasText(paragraph) && !paragraph.querySelector('img') && allTextWithin(paragraph, 'em');
}

function significantChildren(el: Element): ChildNode[] {
  return Array.from(el.childNodes).filter(
    (child) => !(child.nodeType !== ELEMENT && !child.textContent?.trim())
  );
}

function unwrapInside(el: Element, tag: string): void {
  for (const inner of Array.from(el.querySelectorAll(tag))) {
    inner.replaceWith(...Array.from(inner.childNodes));
  }
}
