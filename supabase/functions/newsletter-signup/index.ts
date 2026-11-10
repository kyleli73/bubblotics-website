/*
 * The newsletter sign-up endpoint. It runs as a Supabase Edge Function, a small
 * server program that Supabase runs for us. The website cannot do this job
 * itself: a sign-up needs the Resend key and the service-role key, and anything
 * the website's browser code contains can be read by anyone who opens the page.
 *
 * This file has no imports on purpose. The owner pastes it into the Supabase
 * dashboard's function editor, and that editor does not install packages. It
 * uses only what Deno and the browser already provide: fetch, Web Crypto and
 * TextEncoder.
 *
 * What it does, for each request:
 *   subscribe: checks the form, applies the rate limits, stores a hash of a
 *   one-time token, and emails a confirm link.
 *   confirm: checks the token from that link, adds the person to the Resend
 *   segment, and records when they confirmed.
 *
 * The token itself is never stored. Only its SHA-256 hash is, so a leaked copy
 * of the table cannot confirm anyone.
 */

export type Env = Record<string, string | undefined>;

export type Deps = {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => Date;
  randomBytes: (size: number) => Uint8Array;
};

/*
 * Deno is the runtime Supabase uses. Declared here so this file type-checks in
 * the website's project, where Deno does not exist. A declaration creates no
 * code, so the file also runs as plain TypeScript in the tests.
 */
declare const Deno:
  | {
      env: { toObject(): Record<string, string> };
      serve(handler: (req: Request) => Response | Promise<Response>): unknown;
    }
  | undefined;

const ALLOWED_ORIGINS = [
  'https://bubblotics.ca',
  'https://www.bubblotics.ca',
  'http://localhost:4321',
  'http://localhost:4322',
];

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_SEGMENT_ID',
];

const DEFAULT_SITE_URL = 'https://bubblotics.ca';
const SENDER = 'Bubblotics <newsletter@bubblotics.ca>';
const REPLY_TO = 'bubblotics@gmail.com';
// The team's contact address, shown in the footer. It moves to
// team@bubblotics.ca once that inbox exists. scripts/newsletter/build-email.mjs
// keeps the same value, and its tests check that the two emails agree.
const CONTACT_EMAIL = 'bubblotics@gmail.com';
const RESEND_API = 'https://api.resend.com';
const LOGO_URL = 'https://bubblotics.ca/apple-touch-icon.png';

// Bodies are small forms. Anything bigger is not a sign-up.
const MAX_BODY_BYTES = 2048;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
// 32 random bytes in base64url is always 43 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Config = {
  supabaseUrl: string;
  serviceKey: string;
  resendKey: string;
  segmentId: string;
  siteUrl: string;
};

/* One row of public.newsletter_signups, as far as this function reads it. */
type Row = {
  id: string;
  email: string;
  expires_at: string;
  confirmed_at: string | null;
};

/* A failed call to the database. Its message names the call, never the data. */
class DatabaseError extends Error {}

/* A failed call to Resend. Its message names the call, never the data. */
class ResendError extends Error {}

function defaultDeps(): Deps {
  return {
    fetch: (input, init) => fetch(input, init),
    now: () => new Date(),
    randomBytes: (size) => crypto.getRandomValues(new Uint8Array(size)),
  };
}

/*
 * Reads the settings. Each missing one is named in the log so the owner can add
 * it. The value is never logged, because it may be a secret.
 */
function loadConfig(env: Env): Config | null {
  let missing = false;
  for (const name of REQUIRED_ENV) {
    if (!env[name]) {
      console.error(`newsletter-signup: missing environment variable ${name}`);
      missing = true;
    }
  }
  if (missing) return null;
  return {
    supabaseUrl: env.SUPABASE_URL!.replace(/\/+$/, ''),
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY!,
    resendKey: env.RESEND_API_KEY!,
    segmentId: env.RESEND_SEGMENT_ID!,
    siteUrl: (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, ''),
  };
}

/*
 * CORS is the browser's rule for which websites may call this function. The
 * header is sent only for the origins on the list. A website not on the list
 * gets no header, so the browser refuses to hand it the answer.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  return origin !== null && ALLOWED_ORIGINS.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin }
    : {};
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

/*
 * Reads the request body as a JSON object. Returns null for anything else, and
 * for bodies over the size limit, so a large upload never reaches the checks.
 */
async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/*
 * base64url is base64 with the two characters that are unsafe in a URL swapped
 * out and the padding dropped. Its output is safe to put in a link as is.
 */
function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* Builds a query string. URLSearchParams encodes every value for the URL. */
function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

function isoAgo(now: number, ms: number): string {
  return new Date(now - ms).toISOString();
}

/*
 * Calls the database through PostgREST, the part of Supabase that turns the
 * table into a web address. The service key is sent as both headers Supabase
 * expects. The path is kept free of email addresses in the errors below.
 */
async function dbRequest(
  cfg: Config,
  deps: Deps,
  method: string,
  queryString: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    // return=minimal stops Supabase echoing the row back, which nothing reads.
    headers.Prefer = 'return=minimal';
  }
  const res = await deps.fetch(
    `${cfg.supabaseUrl}/rest/v1/newsletter_signups${queryString}`,
    { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
  );
  if (!res.ok) {
    throw new DatabaseError(`${method} newsletter_signups returned ${res.status}`);
  }
  return res;
}

async function selectRows(cfg: Config, deps: Deps, queryString: string): Promise<Row[]> {
  const res = await dbRequest(cfg, deps, 'GET', `?${queryString}`);
  return (await res.json()) as Row[];
}

/*
 * Calls Resend. The key goes in a bearer header, never in the URL. Callers check
 * the status themselves, because some answers (a contact that already exists)
 * are expected and handled, not errors.
 */
async function resendRequest(
  cfg: Config,
  deps: Deps,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${cfg.resendKey}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return deps.fetch(`${RESEND_API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/*
 * Puts a person in the Newsletter segment. A new contact is created with the
 * segment attached. If Resend says the contact already exists, the existing one
 * is switched back on (it may have unsubscribed earlier) and added to the
 * segment instead. Being in the segment already is the result we want, so it
 * counts as success.
 */
async function addToSegment(cfg: Config, deps: Deps, email: string): Promise<void> {
  const created = await resendRequest(cfg, deps, 'POST', '/contacts', {
    email,
    unsubscribed: false,
    segments: [{ id: cfg.segmentId }],
  });
  if (created.ok) return;

  const contact = `/contacts/${encodeURIComponent(email)}`;
  const updated = await resendRequest(cfg, deps, 'PATCH', contact, { unsubscribed: false });
  if (!updated.ok) {
    throw new ResendError(`PATCH contact returned ${updated.status}`);
  }

  const added = await resendRequest(
    cfg,
    deps,
    'POST',
    `${contact}/segments/${encodeURIComponent(cfg.segmentId)}`,
  );
  if (added.ok) return;
  const detail = await added.text();
  if (added.status === 409 || /already/i.test(detail)) return;
  throw new ResendError(`POST contact segment returned ${added.status}`);
}

/*
 * The confirm email. It must match the one in build-email.mjs, down to the
 * byte. scripts/newsletter/tests checks that both produce the same HTML, so a
 * change made in one place fails the tests until the other is changed too.
 */
export function confirmEmail(link: string): { subject: string; html: string; text: string } {
  const safeLink = escapeHtml(link);
  const content = `
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#102542;">Confirm your subscription</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#1d2b3f;">Tap the button to get the Bubblotics newsletter by email once a month.</p>
<p style="margin:0 0 28px;"><a href="${safeLink}" style="display:inline-block;background:#fec601;color:#102542;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:16px;">Confirm subscription</a></p>
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#4a5b70;">Button not working? Paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeLink}" style="color:#3d72c4;">${safeLink}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#4a5b70;">Didn't sign up? Ignore this email and you won't hear from us.</p>`;
  const footer = `<p style="margin:0 0 4px;">Bubblotics, FTC Team 35858, Aurora, Ontario</p>
<p style="margin:0;"><a href="mailto:${CONTACT_EMAIL}" style="color:#3d72c4;">${CONTACT_EMAIL}</a> &nbsp; <a href="${LOGO_SITE}" style="color:#3d72c4;">bubblotics.ca</a></p>`;

  const html = page({ subject: 'Confirm your Bubblotics newsletter subscription', preheader: '', content, footer });
  const text = [
    'Confirm your subscription',
    '',
    'Tap the button to get the Bubblotics newsletter by email once a month.',
    '',
    'Confirm subscription',
    link,
    '',
    'Button not working? Paste this link into your browser:',
    link,
    '',
    "Didn't sign up? Ignore this email and you won't hear from us.",
    '',
    'Bubblotics, FTC Team 35858, Aurora, Ontario',
    CONTACT_EMAIL,
    'bubblotics.ca',
  ].join('\n');
  return { subject: 'Confirm your Bubblotics newsletter subscription', html, text };
}

const LOGO_SITE = 'https://bubblotics.ca';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/*
 * The frame both emails share: a navy band with the logo, a white card, and a
 * footer. Tables and inline styles, because mail clients ignore most of the
 * rest of CSS.
 */
function page(parts: { subject: string; preheader: string; content: string; footer: string }): string {
  const preheader = parts.preheader
    ? `<div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;color:#eff2f1;mso-hide:all;">${escapeHtml(parts.preheader)}</div>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(parts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eff2f1;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff2f1;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;">
<tr><td style="background:#102542;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO_URL}" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;"></td>
<td style="vertical-align:middle;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#fcfaf9;">Bubblotics</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#102542;">
${parts.content}
</td></tr>
<tr><td style="padding:16px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#4a5b70;">
${parts.footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* Sends the confirm email. Returns false on any failure, and never throws. */
async function sendConfirmEmail(cfg: Config, deps: Deps, email: string, link: string): Promise<boolean> {
  const mail = confirmEmail(link);
  try {
    const res = await resendRequest(cfg, deps, 'POST', '/emails', {
      from: SENDER,
      to: [email],
      reply_to: REPLY_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (!res.ok) {
      console.error(`newsletter-signup: Resend email returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`newsletter-signup: Resend email request failed: ${messageOf(err)}`);
    return false;
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

async function subscribe(
  body: Record<string, unknown>,
  cfg: Config,
  deps: Deps,
  origin: string | null,
): Promise<Response> {
  // The honeypot is a field hidden from people and filled in only by bots. A
  // bot that fills it in gets the same answer as a real sign-up, and nothing is
  // stored or sent.
  const honeypot = body.website;
  if (honeypot !== undefined && honeypot !== null && honeypot !== '') {
    return json(200, { ok: true }, origin);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return json(400, { error: 'invalid_email' }, origin);
  }

  // The limits answer 200 without sending, so a person hitting them learns
  // nothing about whether the address already exists.
  const now = deps.now().getTime();
  const recent = await selectRows(
    cfg,
    deps,
    query({ select: 'id', email: `eq.${email}`, created_at: `gte.${isoAgo(now, 10 * MINUTE)}`, limit: '1' }),
  );
  if (recent.length > 0) return json(200, { ok: true }, origin);

  const daily = await selectRows(
    cfg,
    deps,
    query({ select: 'id', email: `eq.${email}`, created_at: `gte.${isoAgo(now, DAY)}`, limit: '3' }),
  );
  if (daily.length >= 3) return json(200, { ok: true }, origin);

  // Across the whole table. This stops a flood of made-up addresses from using
  // up the free plan's daily email allowance on confirm links nobody asked for.
  const hourly = await selectRows(
    cfg,
    deps,
    query({ select: 'id', created_at: `gte.${isoAgo(now, HOUR)}`, limit: '40' }),
  );
  if (hourly.length >= 40) return json(429, { error: 'busy' }, origin);

  // Only the hash of the token is stored. The token travels in the email link
  // alone.
  const tokenBytes = deps.randomBytes(32);
  const token = base64url(tokenBytes);
  const tokenHash = await sha256Hex(token);
  await dbRequest(cfg, deps, 'POST', '', { email, token_hash: tokenHash });

  const link = `${cfg.siteUrl}/newsletter/confirm/?t=${token}`;
  const sent = await sendConfirmEmail(cfg, deps, email, link);
  if (!sent) {
    // Removing the row keeps the table honest: it holds only sign-ups that got
    // an email. If the delete itself fails, the row stays and expires after
    // seven days. The delete needs a grant that supabase/newsletter-signups.sql
    // does not give yet.
    try {
      await dbRequest(cfg, deps, 'DELETE', `?token_hash=eq.${tokenHash}`);
    } catch (err) {
      console.error(`newsletter-signup: could not remove unsent sign-up: ${messageOf(err)}`);
    }
    return json(502, { error: 'send_failed' }, origin);
  }

  return json(200, { ok: true }, origin);
}

async function confirm(
  body: Record<string, unknown>,
  cfg: Config,
  deps: Deps,
  origin: string | null,
): Promise<Response> {
  const token = typeof body.token === 'string' ? body.token : '';
  if (!TOKEN_PATTERN.test(token)) return json(400, { error: 'invalid_token' }, origin);

  const now = deps.now().getTime();
  const tokenHash = await sha256Hex(token);
  const [row] = await selectRows(
    cfg,
    deps,
    query({ select: 'id,email,expires_at,confirmed_at', token_hash: `eq.${tokenHash}`, limit: '1' }),
  );
  // A link that was never issued and a link that has run out look the same to
  // the person, so both get the same answer.
  if (!row) return json(410, { error: 'expired' }, origin);
  // Confirming twice is harmless, so a second tap from the same email is a success.
  if (row.confirmed_at) return json(200, { ok: true }, origin);
  if (Date.parse(row.expires_at) <= now) return json(410, { error: 'expired' }, origin);

  try {
    await addToSegment(cfg, deps, row.email);
  } catch (err) {
    console.error(`newsletter-signup: Resend segment update failed: ${messageOf(err)}`);
    // The row stays unconfirmed, so the same link can be tried again.
    return json(502, { error: 'resend_failed' }, origin);
  }

  await dbRequest(
    cfg,
    deps,
    'PATCH',
    `?id=eq.${encodeURIComponent(row.id)}`,
    { confirmed_at: new Date(now).toISOString() },
  );
  return json(200, { ok: true }, origin);
}

export async function handle(req: Request, env: Env, deps: Deps = defaultDeps()): Promise<Response> {
  const origin = req.headers.get('origin');

  // The browser asks permission with OPTIONS before a cross-site POST. Nothing
  // is stored or sent for it, so it is answered before any settings are read.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
      },
    });
  }
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const cfg = loadConfig(env);
  if (!cfg) return json(500, { error: 'not_configured' }, origin);

  const body = await readBody(req);
  if (!body) return json(400, { error: 'invalid_body' }, origin);

  try {
    if (body.action === 'subscribe') return await subscribe(body, cfg, deps, origin);
    if (body.action === 'confirm') return await confirm(body, cfg, deps, origin);
    return json(400, { error: 'unknown_action' }, origin);
  } catch (err) {
    // Only the message is logged. DatabaseError and ResendError messages hold
    // no addresses or tokens.
    console.error(`newsletter-signup: request failed: ${messageOf(err)}`);
    return json(500, { error: 'database_failed' }, origin);
  }
}

if (typeof Deno !== 'undefined') Deno.serve((req) => handle(req, Deno.env.toObject()));
