/*
 * Turns the team's Word file into issue HTML, in the browser.
 *
 * mammoth reads the .docx and writes HTML. Each photo is decoded here, shrunk
 * so its long edge is at most 1600 px, and written as WebP (JPEG where the
 * browser cannot write WebP). Photos are most of an issue's size, so this is
 * where an upload stays small. Nothing is uploaded here. The publish step
 * sends the photos, and it works from this result.
 *
 * Only the team page loads this file, through a dynamic import, so the public
 * pages never download mammoth.
 */

import mammoth from 'mammoth';
import { isItalicCaption, normalise } from './newsletter-render';

const MAX_EDGE = 1600;
const MAX_PHOTOS = 60;
const SUMMARY_MIN = 20;
const SUMMARY_MAX = 180;

/** A photo ready to upload. `blob` is exactly what goes to the bucket. */
export type PreparedImage = {
  blob: Blob;
  ext: 'webp' | 'jpg' | 'gif';
  width: number;
  height: number;
};

export type ConvertResult = {
  /**
   * The issue HTML. Each photo is a placeholder: nlimg:N means images[N]. The
   * publish step swaps the placeholders for real addresses, and the preview
   * swaps them for object URLs.
   */
  html: string;
  images: PreparedImage[];
  /** First paragraph as plain text, for the list. Null if there is none. */
  summary: string | null;
  /** Things to fix that do not stop the issue from being published. */
  warnings: string[];
};

/* A problem that stops the file from being used. Its message is for the team. */
export class ConvertError extends Error {}

/*
 * Word styles to HTML. Google Docs writes lowercase style names and Word writes
 * capitalised ones, so both spellings are listed. Title and subtitle are
 * dropped on purpose: the issue's title comes from the form, and a second title
 * in the body would repeat it.
 */
const STYLE_MAP = [
  "p[style-name='Title'] => !",
  "p[style-name='title'] => !",
  "p[style-name='Subtitle'] => !",
  "p[style-name='subtitle'] => !",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h4:fresh",
  "p[style-name='heading 5'] => h4:fresh",
  "p[style-name='Heading 6'] => h4:fresh",
  "p[style-name='heading 6'] => h4:fresh",
  'u => u',
  'strike => s',
];

/* What mammoth hands the image callback. Only these two members are used. */
type ImageSource = {
  contentType: string;
  read(encoding: string): Promise<string>;
};

export async function convertDocx(file: File): Promise<ConvertResult> {
  const images: PreparedImage[] = [];
  let dropped = 0;

  // Photos are prepared one after another, in the order mammoth asks for them.
  // That keeps the index written into the HTML equal to the index in images.
  let queue: Promise<unknown> = Promise.resolve();
  const convertImage = mammoth.images.imgElement((image) => {
    const job = queue.then(async () => {
      try {
        const prepared = await prepareImage(image);
        const index = images.length;
        images.push(prepared);
        // mammoth writes attributes as text, so the sizes go in as strings.
        return { src: `nlimg:${index}`, width: String(prepared.width), height: String(prepared.height) };
      } catch {
        // EMF, WMF and anything else the browser cannot decode. The image is
        // left out and counted, so the team hears about it in a warning.
        dropped++;
        return { src: '' };
      }
    });
    queue = job.catch(() => undefined);
    return job;
  });

  let html: string;
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      { styleMap: STYLE_MAP, convertImage }
    );
    html = result.value;
  } catch {
    throw new ConvertError("Couldn't read this Word file. Download it again.");
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = normalise(doc.body.textContent ?? '');
  if (!text) {
    throw new ConvertError('This file is empty.');
  }
  if (images.length > MAX_PHOTOS) {
    throw new ConvertError(`Max ${MAX_PHOTOS} photos per issue.`);
  }

  return {
    html,
    images,
    summary: firstSummary(doc.body),
    warnings: warningsFor(doc.body, text, dropped),
  };
}

/*
 * Decodes one photo and re-encodes it. A GIF is kept as it is, since
 * re-encoding would drop its animation. Anything else is shrunk and written as
 * WebP. createImageBitmap rejects whatever the browser cannot decode, and the
 * caller treats that rejection as "drop this photo".
 */
async function prepareImage(image: ImageSource): Promise<PreparedImage> {
  const base64 = await image.read('base64');
  const source = new Blob([base64ToBytes(base64)], { type: image.contentType });
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  if (image.contentType === 'image/gif') {
    bitmap.close();
    return { blob: source, ext: 'gif', width, height };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser has no canvas.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const webp = await encode(canvas, 'image/webp', 0.82);
  if (webp.type === 'image/webp') {
    return { blob: webp, ext: 'webp', width: w, height: h };
  }

  // Older Safari cannot write WebP and hands back a PNG instead. JPEG has no
  // transparency, so white is painted behind the photo before it is encoded.
  // Behind, not on top: the photo is already on the canvas.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const jpeg = await encode(canvas, 'image/jpeg', 0.85);
  if (jpeg.type !== 'image/jpeg') throw new Error('This browser cannot write JPEG.');
  return { blob: jpeg, ext: 'jpg', width: w, height: h };
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be encoded.'))),
      type,
      quality
    );
  });
}

/*
 * The first paragraph or list item outside a table that reads as a sentence.
 * Italic-only paragraphs are photo captions, so they are skipped. Short lines
 * are skipped too, since a heading-like line makes a poor summary.
 */
export function firstSummary(root: Element): string | null {
  for (const el of Array.from(root.querySelectorAll('p, li'))) {
    if (el.closest('table')) continue;
    if (el.nodeName === 'P' && isItalicCaption(el)) continue;
    const text = normalise(el.textContent ?? '');
    if (text.length >= SUMMARY_MIN) return clip(text, SUMMARY_MAX);
  }
  return null;
}

/* Cuts at a word boundary and marks the cut with "...", within the limit. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}...`;
}

/*
 * Problems the team should look at before publishing. Each one is a warning,
 * not an error, because an issue with a stray bracket is still a real issue.
 */
function warningsFor(body: Element, text: string, dropped: number): string[] {
  const warnings: string[] = [];

  const prompts = text.match(/\[[^\]\n]{2,}\]/g) ?? [];
  if (prompts.length > 0) {
    warnings.push(`Still has template prompts: ${prompts.slice(0, 5).join(', ')}`);
  }

  // A download of the whole doc carries the How to tab and every issue tab.
  // The template's own heading names both of those cases.
  const headings = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((heading) =>
    normalise(heading.textContent ?? '').toLowerCase()
  );
  const howTo = headings.includes('how to write a newsletter issue');
  const repeatedBrief = headings.filter((heading) => heading === 'the two weeks in brief').length > 1;
  if (howTo || repeatedBrief) {
    warnings.push('This file has more than one tab in it. Download again and pick Current tab.');
  }

  if (dropped > 0) {
    const noun = dropped === 1 ? 'image' : 'images';
    const verb = dropped === 1 ? 'was' : 'were';
    warnings.push(`${dropped} ${noun} couldn't be read and ${verb} left out. Use JPG or PNG photos.`);
  }

  return warnings;
}
