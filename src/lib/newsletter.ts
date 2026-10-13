/*
 * The newsletter's connection to Supabase, and the checks the browser makes
 * before it sends anything.
 *
 * Supabase is the hosted database and file store that the team's scouting app
 * already uses. Newsletters live there: one row per issue in a table, holding
 * the issue as HTML, and the issue's photos in a public storage bucket. The
 * rules that decide who may change them are in supabase/newsletters.sql, not
 * in this file. Nothing here is a security boundary. The checks below make the
 * browser ask the right question and fail early with a plain sentence.
 * Supabase still makes the final call.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { url } from './paths';

/*
 * The project URL and the publishable key are public by design. Supabase
 * expects them in browser code. What they allow is decided by the row and
 * storage rules in supabase/newsletters.sql. The secret key must never be
 * written into this repository.
 */
export const SUPABASE_URL = 'https://hhxwvxzlykycnuzkjccn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J8GLgVOd2ZWr8SI3MduKoA_SOdMLcP6';

/** The one account allowed to edit. The website's username maps to it. */
export const NEWSLETTER_EMAIL = 'bubblotics+newsletter@gmail.com';

/** The public storage bucket that holds the photos. Must match the SQL. */
export const BUCKET = 'newsletters';

/*
 * Every photo's public address starts with this. The sanitiser keeps an image
 * only when its address starts with it, so an issue cannot show a picture
 * from somewhere else on the internet.
 */
export const PHOTO_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

/* A photo's path inside the bucket: <slug>/<version>/<n>.<ext>. */
const PHOTO_PATH = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]{6}\/[0-9]{1,3}\.(webp|jpg|png|gif)$/;

/*
 * The largest Word file the team page will read. The Word file is only read
 * in the browser, so this guards the browser's memory and a slow conversion,
 * not the server.
 */
export const MAX_DOCX_BYTES = 20 * 1024 * 1024;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* One issue as stored. The body is only read when an issue is opened. */
export type Newsletter = {
  id: string;
  title: string;
  /** 'YYYY-MM-DD'. Format with formatDate(new Date(issue_date)). */
  issue_date: string;
  /** The address of the issue page. Set once and never changed. */
  slug: string;
  /** The issue as HTML. Sanitised again every time it is shown. */
  body_html: string;
  /** First paragraph as plain text, for the list. Null if there is none. */
  summary: string | null;
  /** The first photo's public address, for the list. Null if no photos. */
  cover_url: string | null;
  created_at: string;
  updated_at: string;
};

/*
 * What the list pages need. body_html is left out on purpose: it can be large,
 * and nothing in a list uses it. A list item cannot be used as a full issue by
 * mistake, because the type has no body.
 */
export type NewsletterSummary = Pick<
  Newsletter,
  'id' | 'title' | 'issue_date' | 'slug' | 'summary' | 'cover_url' | 'created_at'
>;

let client: SupabaseClient | undefined;

/*
 * The Supabase client, built on first use rather than at import. Only pages
 * that import this file include the library in their bundle, and building the
 * client waits until something actually calls it. Sessions are kept in
 * localStorage (the supabase-js default), so the editor stays signed in on
 * this device between visits.
 */
export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

/*
 * Newest issue first. Two issues can share a date, so created_at breaks the
 * tie. The public page and the team page both use this order.
 */
export async function listNewsletters(): Promise<NewsletterSummary[]> {
  const { data, error } = await supabase()
    .from('newsletters')
    .select('id, title, issue_date, slug, summary, cover_url, created_at')
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NewsletterSummary[];
}

/*
 * One whole issue, body included, or null when no issue has that slug. The
 * slug is unique, so there is at most one row to return.
 */
export async function getNewsletter(slug: string): Promise<Newsletter | null> {
  const { data, error } = await supabase()
    .from('newsletters')
    .select('id, title, issue_date, slug, body_html, summary, cover_url, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Newsletter | null) ?? null;
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

/* The public address of one photo, given its path inside the bucket. */
export function photoUrl(path: string): string {
  return PHOTO_PREFIX + path;
}

/*
 * The photo paths an issue uses, read from its stored HTML. Replacing or
 * deleting an issue removes these from the bucket. DOMParser gives back an
 * inert document, so nothing in the HTML loads or runs while it is read.
 */
export function photoPathsIn(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const paths = new Set<string>();
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? '';
    if (!src.startsWith(PHOTO_PREFIX)) continue;
    const path = src.slice(PHOTO_PREFIX.length);
    // Only paths in the shape this site uploads. Anything else is left alone.
    if (PHOTO_PATH.test(path)) paths.add(path);
  }
  return [...paths];
}

/*
 * The address of an issue page. The slug is the issue's permanent address, so
 * a link saved from an older version of this page keeps working.
 */
export function issueHref(slug: string): string {
  return `${url('/newsletter/issue/')}?n=${encodeURIComponent(slug)}`;
}

export type ResolvedUsername =
  | { ok: true; email: string }
  | { ok: false; error: string };

/*
 * The Username box takes the short name the team shares. Supabase signs in
 * with an email, so the short name is mapped to the newsletter account. A full
 * email typed in is passed through unchanged.
 */
export function resolveUsername(input: string): ResolvedUsername {
  const trimmed = input.trim();
  if (trimmed.toLowerCase() === 'bubblotics') {
    return { ok: true, email: NEWSLETTER_EMAIL };
  }
  if (trimmed.includes('@')) {
    return { ok: true, email: trimmed };
  }
  return { ok: false, error: 'Unknown username.' };
}

/*
 * The sentence to show for a failed sign-in. It reads only the status and the
 * error name, never the message, so nothing the server sends back can reach
 * the page, and the password is never part of what gets shown.
 */
export function signInMessage(error: { status?: number; name?: string }): string {
  if (error.status === 429) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  // No response at all: the phone is offline or the server is unreachable.
  // Calling that "wrong password" would send the editor to retype a correct one.
  if (error.name === 'AuthRetryableFetchError') {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return 'Wrong username or password.';
}

/*
 * Turns a title into the part of an issue's address that the table's check
 * constraint allows: lowercase letters, digits and dashes. Accents are
 * folded to their base letter, and the result is capped so paths stay short.
 */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'issue';
}

const VERSION_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/*
 * The slug an issue is published under: <issue_date>-<title slug>. If another
 * issue already has that slug, -2, -3 and so on are added. The slug is the
 * issue's address, so it is chosen once here and never changed afterwards.
 */
export async function makeSlug(issueDate: string, title: string): Promise<string> {
  if (!isIsoDate(issueDate)) {
    throw new Error(`Not a date: ${issueDate}`);
  }
  const base = `${issueDate}-${slugify(title)}`;
  for (let n = 1; n <= 99; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase()
      .from('newsletters')
      .select('id')
      .eq('slug', candidate);
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
  }
  throw new Error('Too many issues with this title and date.');
}

/*
 * A new folder name for one upload of an issue's photos. Six random characters.
 *
 * The random part matters for replacements. Supabase's CDN caches public files
 * by path, so overwriting a photo in place would leave readers with the old
 * copy for a long time. Every upload gets a fresh folder instead.
 */
export function makeVersion(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => VERSION_CHARS[b % VERSION_CHARS.length]).join('');
}

function startsWithBytes(head: Uint8Array, bytes: number[]): boolean {
  return bytes.every((byte, i) => head[i] === byte);
}

/*
 * Checks a chosen file before it is converted. Returns the sentence to show,
 * or null when the file looks like a Word file. The file name and the browser's
 * type can both be wrong, so the first bytes decide: a Word file is a zip, and
 * a zip starts with PK. A PDF or an old .doc is named, since those are the
 * mistakes the team makes most often.
 */
export async function checkDocx(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (startsWithBytes(head, [0x25, 0x50, 0x44, 0x46])) {
    return "That's a PDF. In Google Docs use File > Download > Microsoft Word (.docx).";
  }
  if (startsWithBytes(head, [0xd0, 0xcf, 0x11, 0xe0])) {
    return "That's an old .doc file. Download as Microsoft Word (.docx).";
  }
  if (file.size > MAX_DOCX_BYTES) {
    return 'That file is over 20 MB.';
  }
  if (!startsWithBytes(head, [0x50, 0x4b, 0x03, 0x04])) {
    return "That isn't a Word file.";
  }
  return null;
}

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string') return message.toLowerCase();
  }
  return '';
}

/*
 * Turns a Supabase error into a sentence a team member can act on. Only the
 * message text is read, so raw JSON never reaches the page. Anything not
 * recognised gets the fallback for the action that failed.
 */
export function describeError(error: unknown, fallback: string): string {
  const message = messageOf(error);
  if (message.includes('failed to fetch') || message.includes('load failed')) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (message.includes('row-level security')) {
    return 'This account is not allowed to make that change.';
  }
  // The slug is unique, so this means another issue took it during the save.
  if (message.includes('already exists') || message.includes('duplicate key')) {
    return 'Another issue with that title and date was just saved. Change one and try again.';
  }
  // The bucket limit. The browser shrinks photos first, so this is an
  // unusually large GIF.
  if (message.includes('maximum allowed size')) {
    return 'A photo is larger than 10 MB. Use a smaller one.';
  }
  return fallback;
}
