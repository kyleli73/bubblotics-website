/*
 * The newsletter's connection to Supabase, and the checks the browser makes
 * before it sends anything.
 *
 * Supabase is the hosted database and file store that the team's scouting app
 * already uses. Newsletters live there: one row per issue in a table, and one
 * PDF per row in a public storage bucket. The rules that decide who may change
 * them are in supabase/newsletters.sql, not in this file. Nothing here is a
 * security boundary. The checks below make the browser ask the right question
 * and fail early with a plain sentence. Supabase still makes the final call.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

/** The public storage bucket that holds the PDFs. Must match the SQL. */
export const BUCKET = 'newsletters';

/*
 * The bucket refuses anything over this, whatever the browser claims. The
 * check here exists so a big file fails before a slow upload, not after.
 */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/* The same pattern as the table's file_path check constraint. */
const FILE_PATTERN = /^[a-z0-9-]+\.pdf$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Newsletter = {
  id: string;
  title: string;
  /** 'YYYY-MM-DD'. Format with formatDate(new Date(issue_date)). */
  issue_date: string;
  file_path: string;
  created_at: string;
  updated_at: string;
};

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
export async function listNewsletters(): Promise<Newsletter[]> {
  const { data, error } = await supabase()
    .from('newsletters')
    .select('id, title, issue_date, file_path, created_at, updated_at')
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Newsletter[];
}

/* The public URL of a PDF in the bucket. Readers need no sign-in to open it. */
export function pdfUrl(filePath: string): string {
  return supabase().storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
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
 * Turns a slug from a title into the part of a file name allowed by the
 * table's check constraint: lowercase letters, digits and dashes. Accents are
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

const SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => SUFFIX_CHARS[b % SUFFIX_CHARS.length]).join('');
}

/*
 * A new, never-used file name: <issue_date>-<title slug>-<4 random characters>.pdf.
 *
 * The random part matters for replacements. Supabase's CDN caches public files
 * by path, so overwriting a PDF in place would leave readers with the old copy
 * for a long time. A replacement always gets a fresh path instead.
 */
export function makeFilePath(issueDate: string, title: string): string {
  if (!isIsoDate(issueDate)) {
    throw new Error(`Not a date: ${issueDate}`);
  }
  const path = `${issueDate}-${slugify(title)}-${randomSuffix()}.pdf`;
  if (!FILE_PATTERN.test(path)) {
    throw new Error(`Generated a file name the table rejects: ${path}`);
  }
  return path;
}

/*
 * Checks a chosen file before it is uploaded. Returns the sentence to show, or
 * null when the file is fine. The browser's type comes from the file name, so
 * a renamed file can pass that check. The first five bytes are checked too.
 */
export async function checkPdf(file: File): Promise<string | null> {
  if (file.type !== 'application/pdf') {
    return 'That file is not a PDF.';
  }
  if (file.size > MAX_PDF_BYTES) {
    return 'That PDF is larger than 20 MB.';
  }
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const magic = '%PDF-';
  for (let i = 0; i < magic.length; i++) {
    if (head[i] !== magic.charCodeAt(i)) {
      return 'That file is not a PDF.';
    }
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
  if (message.includes('already exists') || message.includes('duplicate key')) {
    return 'That file name is already in use. Try again.';
  }
  if (message.includes('maximum allowed size')) {
    return 'That PDF is larger than 20 MB.';
  }
  return fallback;
}
