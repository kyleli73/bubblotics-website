import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { handle, confirmEmail } from '../../../supabase/functions/newsletter-signup/index.ts';
import { buildConfirmEmail } from '../build-email.mjs';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const ORIGIN = 'https://bubblotics.ca';
const FUNCTION_URL = 'https://hhxwvxzlykycnuzkjccn.functions.supabase.co/newsletter-signup';

const ENV = {
  SUPABASE_URL: 'https://db.example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service_TEST_only_key',
  RESEND_API_KEY: 're_TEST_only_key',
  RESEND_SEGMENT_ID: 'seg_newsletter',
};

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/*
 * An in-memory stand-in for the two services the function calls: the Supabase
 * table (through PostgREST's URL style) and Resend. Every call is recorded, so a
 * test can check what was asked, and each outcome can be forced to fail.
 */
function world(options = {}) {
  const state = {
    rows: options.rows ?? [],
    emails: [],
    contacts: [],
    resendCalls: [],
  };

  const fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;

    if (url.origin === ENV.SUPABASE_URL) {
      if (options.dbDown) return new Response('down', { status: 500 });
      return database(url, method, body);
    }

    if (url.origin === 'https://api.resend.com') {
      state.resendCalls.push({ method, path: url.pathname, body });
      return resend(url, method, body);
    }
    throw new Error(`unexpected host ${url.origin}`);
  };

  function database(url, method, body) {
    if (url.pathname !== '/rest/v1/newsletter_signups') {
      return new Response('wrong table', { status: 404 });
    }
    const filters = [...url.searchParams.entries()].filter(
      ([key]) => key !== 'select' && key !== 'limit',
    );
    const matching = () =>
      state.rows.filter((row) =>
        filters.every(([key, value]) => {
          const op = value.slice(0, value.indexOf('.'));
          const operand = value.slice(value.indexOf('.') + 1);
          if (op === 'eq') return String(row[key]) === operand;
          if (op === 'gte') return Date.parse(row[key]) >= Date.parse(operand);
          throw new Error(`unsupported filter ${op}`);
        }),
      );

    if (method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? Infinity);
      return json(200, matching().slice(0, limit).map((row) => ({ ...row })));
    }
    if (method === 'POST') {
      state.rows.push({
        id: randomUUID(),
        email: body.email,
        token_hash: body.token_hash,
        created_at: NOW.toISOString(),
        expires_at: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        confirmed_at: null,
        source: 'bubblotics.ca/newsletter',
      });
      return new Response(null, { status: 201 });
    }
    if (method === 'PATCH') {
      for (const row of matching()) Object.assign(row, body);
      return new Response(null, { status: 204 });
    }
    if (method === 'DELETE') {
      if (options.deleteDenied) return json(403, { message: 'permission denied' });
      const doomed = new Set(matching());
      state.rows = state.rows.filter((row) => !doomed.has(row));
      return new Response(null, { status: 204 });
    }
    return new Response('method', { status: 405 });
  }

  function resend(url, method, body) {
    if (url.pathname === '/emails' && method === 'POST') {
      state.emails.push(body);
      return json(options.resendEmailStatus ?? 200, { id: 'email_1' });
    }
    if (url.pathname === '/contacts' && method === 'POST') {
      state.contacts.push(body);
      if (options.contactExists) return json(409, { message: 'Contact already exists' });
      return json(201, { id: 'contact_1' });
    }
    if (url.pathname.startsWith('/contacts/') && url.pathname.endsWith(`/segments/${ENV.RESEND_SEGMENT_ID}`)) {
      return new Response(options.segmentBody ?? '', { status: options.segmentStatus ?? 200 });
    }
    if (url.pathname.startsWith('/contacts/') && method === 'PATCH') {
      return json(options.patchStatus ?? 200, { id: 'contact_1' });
    }
    return new Response('not found', { status: 404 });
  }

  let seed = 0;
  const deps = {
    fetch,
    now: () => NOW,
    // A different byte pattern each call, so two sign-ups never share a token.
    randomBytes: (size) => {
      seed += 1;
      return Uint8Array.from({ length: size }, (_, i) => (seed * 31 + i * 7) % 256);
    },
  };

  return { state, deps };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function request(body, { origin = ORIGIN, method = 'POST' } = {}) {
  return new Request(FUNCTION_URL, {
    method,
    headers: { 'content-type': 'application/json', origin },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}

async function call(w, body, env = ENV, options) {
  const res = await handle(request(body, options), env, w.deps);
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

/* The token from the most recent email, read out of its plain-text body. */
function tokenFromEmail(w) {
  const mail = w.state.emails.at(-1);
  const match = /\?t=([A-Za-z0-9_-]{43})/.exec(mail.text);
  assert.ok(match, 'the email carries a link with a token');
  return match[1];
}

async function signUp(w, email = 'kyle@example.com') {
  return call(w, { action: 'subscribe', email, website: '' });
}

test('a filled-in honeypot gets ok and nothing is stored or sent', async () => {
  const w = world();
  const res = await call(w, { action: 'subscribe', email: 'bot@example.com', website: 'spam' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(w.state.rows.length, 0);
  assert.equal(w.state.resendCalls.length, 0);
});

test('an empty honeypot is an ordinary sign-up', async () => {
  const w = world();
  const res = await signUp(w);
  assert.equal(res.status, 200);
  assert.equal(w.state.rows.length, 1);
});

test('an invalid email is refused with a 400', async () => {
  const w = world();
  for (const email of ['not-an-email', 'a@b', 'a b@example.com', '']) {
    const res = await call(w, { action: 'subscribe', email, website: '' });
    assert.equal(res.status, 400, email);
    assert.deepEqual(res.body, { error: 'invalid_email' });
  }
  assert.equal(w.state.rows.length, 0);
});

test('the email is trimmed and lowercased before it is stored', async () => {
  const w = world();
  await call(w, { action: 'subscribe', email: '  Kyle@Example.COM ', website: '' });
  assert.equal(w.state.rows[0].email, 'kyle@example.com');
});

test('the database stores the hash of the token, and the emailed link carries a token that matches it', async () => {
  const w = world();
  assert.equal((await signUp(w)).status, 200);
  const row = w.state.rows[0];
  const token = tokenFromEmail(w);
  assert.equal(token.length, 43);
  assert.equal(row.token_hash, sha256(token));
  assert.notEqual(row.token_hash, token, 'the token itself is never stored');
  assert.ok(w.state.emails[0].text.includes('https://bubblotics.ca/newsletter/confirm/?t='));
});

test('the email goes to the sign-up address from the Bubblotics sender', async () => {
  const w = world();
  await signUp(w, 'kyle@example.com');
  const mail = w.state.emails[0];
  assert.deepEqual(mail.to, ['kyle@example.com']);
  assert.equal(mail.from, 'Bubblotics <newsletter@bubblotics.ca>');
  assert.equal(mail.reply_to, 'bubblotics@gmail.com');
  assert.equal(mail.subject, 'Confirm your Bubblotics newsletter subscription');
});

test('a second sign-up from the same address within 10 minutes is answered and not stored', async () => {
  const w = world({
    rows: [{ id: 'old', email: 'kyle@example.com', token_hash: 'x', created_at: '2026-11-10T11:55:00.000Z', expires_at: '2026-11-17T11:55:00.000Z', confirmed_at: null }],
  });
  const res = await signUp(w);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(w.state.rows.length, 1);
  assert.equal(w.state.resendCalls.length, 0);
});

test('a third sign-up from the same address in 24 hours is answered and not sent', async () => {
  const older = (minutesAgo) => ({
    id: randomUUID(),
    email: 'kyle@example.com',
    token_hash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    created_at: new Date(NOW.getTime() - minutesAgo * 60 * 1000).toISOString(),
    expires_at: NOW.toISOString(),
    confirmed_at: null,
  });
  const w = world({ rows: [older(60), older(120), older(180)] });
  const res = await signUp(w);
  assert.equal(res.status, 200);
  assert.equal(w.state.rows.length, 3, 'nothing new is stored');
  assert.equal(w.state.resendCalls.length, 0);
});

test('two earlier sign-ups in 24 hours do not block a third', async () => {
  const older = (minutesAgo) => ({
    id: randomUUID(),
    email: 'kyle@example.com',
    token_hash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    created_at: new Date(NOW.getTime() - minutesAgo * 60 * 1000).toISOString(),
    expires_at: NOW.toISOString(),
    confirmed_at: null,
  });
  const w = world({ rows: [older(60), older(120)] });
  assert.equal((await signUp(w)).status, 200);
  assert.equal(w.state.rows.length, 3);
  assert.equal(w.state.resendCalls.length, 1);
});

test('40 sign-ups across the table in the last hour gets a 429 busy', async () => {
  const flood = Array.from({ length: 40 }, (_, i) => ({
    id: randomUUID(),
    email: `person${i}@example.com`,
    token_hash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    created_at: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
    expires_at: NOW.toISOString(),
    confirmed_at: null,
  }));
  const w = world({ rows: flood });
  const res = await signUp(w);
  assert.equal(res.status, 429);
  assert.deepEqual(res.body, { error: 'busy' });
  assert.equal(w.state.rows.length, 40);
});

test('39 sign-ups in the last hour still lets a new one through', async () => {
  const flood = Array.from({ length: 39 }, (_, i) => ({
    id: randomUUID(),
    email: `person${i}@example.com`,
    token_hash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    created_at: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
    expires_at: NOW.toISOString(),
    confirmed_at: null,
  }));
  const w = world({ rows: flood });
  assert.equal((await signUp(w)).status, 200);
  assert.equal(w.state.rows.length, 40);
});

test('when the confirm email fails, the row is deleted and the answer is 502', async () => {
  const w = world({ resendEmailStatus: 500 });
  const res = await signUp(w);
  assert.equal(res.status, 502);
  assert.deepEqual(res.body, { error: 'send_failed' });
  assert.equal(w.state.rows.length, 0);
});

test('when the confirm email fails and the delete is refused, the answer is still 502', async () => {
  const w = world({ resendEmailStatus: 500, deleteDenied: true });
  const res = await signUp(w);
  assert.equal(res.status, 502);
  assert.deepEqual(res.body, { error: 'send_failed' });
  assert.equal(w.state.rows.length, 1, 'the row stays, and expires after seven days');
});

test('confirming adds the person to the segment and records the time', async () => {
  const w = world();
  await signUp(w);
  const token = tokenFromEmail(w);
  const res = await call(w, { action: 'confirm', token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(w.state.rows[0].confirmed_at, NOW.toISOString());
  assert.deepEqual(w.state.contacts[0], {
    email: 'kyle@example.com',
    unsubscribed: false,
    segments: [{ id: 'seg_newsletter' }],
  });
});

test('confirming when the Resend contact already exists updates it and adds it to the segment', async () => {
  const w = world({ contactExists: true });
  await signUp(w);
  const res = await call(w, { action: 'confirm', token: tokenFromEmail(w) });
  assert.equal(res.status, 200);
  const patch = w.state.resendCalls.find((c) => c.method === 'PATCH');
  assert.equal(patch.path, '/contacts/kyle%40example.com');
  assert.deepEqual(patch.body, { unsubscribed: false });
  const segment = w.state.resendCalls.find((c) => c.path.includes('/segments/'));
  assert.equal(segment.method, 'POST');
  assert.equal(segment.path, '/contacts/kyle%40example.com/segments/seg_newsletter');
  assert.equal(w.state.rows[0].confirmed_at, NOW.toISOString());
});

test('an already-in-segment answer from Resend counts as success', async () => {
  const w = world({ contactExists: true, segmentStatus: 422, segmentBody: '{"message":"Contact is already in the segment"}' });
  await signUp(w);
  const res = await call(w, { action: 'confirm', token: tokenFromEmail(w) });
  assert.equal(res.status, 200);
  assert.equal(w.state.rows[0].confirmed_at, NOW.toISOString());
});

test('a segment error that is not about duplicates is a failure', async () => {
  const w = world({ contactExists: true, segmentStatus: 500, segmentBody: 'boom' });
  await signUp(w);
  const res = await call(w, { action: 'confirm', token: tokenFromEmail(w) });
  assert.equal(res.status, 502);
  assert.deepEqual(res.body, { error: 'resend_failed' });
  assert.equal(w.state.rows[0].confirmed_at, null, 'the row stays unconfirmed for another try');
});

test('a token that has run out gets 410 expired and nothing is sent', async () => {
  const w = world();
  await signUp(w);
  const token = tokenFromEmail(w);
  w.state.rows[0].expires_at = new Date(NOW.getTime() - 60 * 1000).toISOString();
  const callsBefore = w.state.resendCalls.length;
  const res = await call(w, { action: 'confirm', token });
  assert.equal(res.status, 410);
  assert.deepEqual(res.body, { error: 'expired' });
  assert.equal(w.state.resendCalls.length, callsBefore);
  assert.equal(w.state.rows[0].confirmed_at, null);
});

test('a token nobody issued gets the same 410 as an expired one', async () => {
  const w = world();
  const res = await call(w, { action: 'confirm', token: 'A'.repeat(43) });
  assert.equal(res.status, 410);
  assert.deepEqual(res.body, { error: 'expired' });
});

test('confirming twice is harmless and makes no second Resend call', async () => {
  const w = world();
  await signUp(w);
  const token = tokenFromEmail(w);
  assert.equal((await call(w, { action: 'confirm', token })).status, 200);
  const callsAfterFirst = w.state.resendCalls.length;
  const again = await call(w, { action: 'confirm', token });
  assert.equal(again.status, 200);
  assert.deepEqual(again.body, { ok: true });
  assert.equal(w.state.resendCalls.length, callsAfterFirst);
});

test('a malformed token is refused with a 400', async () => {
  const w = world();
  for (const token of ['short', 'x'.repeat(44), 'bad token with spaces 1234567890123456789012345', 42]) {
    const res = await call(w, { action: 'confirm', token });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'invalid_token' });
  }
});

test('a failed Resend update during confirm leaves the row unconfirmed and answers 502', async () => {
  const w = world({ contactExists: true, patchStatus: 500 });
  await signUp(w);
  const res = await call(w, { action: 'confirm', token: tokenFromEmail(w) });
  assert.equal(res.status, 502);
  assert.deepEqual(res.body, { error: 'resend_failed' });
  assert.equal(w.state.rows[0].confirmed_at, null);
});

test('a database outage answers 500 and does not leak the error text', async () => {
  const w = world({ dbDown: true });
  const res = await signUp(w);
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'database_failed' });
});

test('an unknown action is refused', async () => {
  const w = world();
  const res = await call(w, { action: 'delete_everyone' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'unknown_action' });
});

test('a CORS preflight from an allowed site gets 204 and the headers the browser needs', async () => {
  const w = world();
  const res = await handle(request(null, { origin: ORIGIN, method: 'OPTIONS' }), ENV, w.deps);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'content-type, apikey, authorization, x-client-info');
});

test('localhost preview origins are allowed, other origins get no CORS header', async () => {
  const w = world();
  const local = await handle(request(null, { origin: 'http://localhost:4322', method: 'OPTIONS' }), ENV, w.deps);
  assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:4322');

  const stranger = await handle(request(null, { origin: 'https://evil.example', method: 'OPTIONS' }), ENV, w.deps);
  assert.equal(stranger.status, 204);
  assert.equal(stranger.headers.get('access-control-allow-origin'), null);
});

test('a JSON answer to a disallowed site carries no CORS header', async () => {
  const w = world();
  const res = await handle(request({ action: 'subscribe', email: 'kyle@example.com', website: '' }, { origin: 'https://evil.example' }), ENV, w.deps);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('a GET is refused with a 405 JSON answer that still names the allowed origin', async () => {
  const w = world();
  const res = await handle(request(null, { origin: ORIGIN, method: 'GET' }), ENV, w.deps);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.deepEqual(await res.json(), { error: 'method_not_allowed' });
});

test('a body over 2 KB or not JSON is refused with a 400', async () => {
  const w = world();
  const big = JSON.stringify({ action: 'subscribe', email: 'kyle@example.com', website: 'x'.repeat(2100) });
  assert.equal((await call(w, big)).status, 400);
  assert.equal((await call(w, 'not json at all')).status, 400);
  assert.equal((await call(w, '[1,2,3]')).status, 400);
});

test('a missing setting is named in the log, its value is not, and the answer is 500', async () => {
  const w = world();
  const logged = mock.method(console, 'error', () => {});
  try {
    const env = { ...ENV, RESEND_SEGMENT_ID: undefined };
    const res = await call(w, { action: 'subscribe', email: 'kyle@example.com', website: '' }, env);
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: 'not_configured' });
    const lines = logged.mock.calls.map((c) => c.arguments.join(' ')).join('\n');
    assert.match(lines, /RESEND_SEGMENT_ID/);
    assert.ok(!lines.includes(ENV.SUPABASE_SERVICE_ROLE_KEY));
    assert.ok(!lines.includes(ENV.RESEND_API_KEY));
  } finally {
    logged.mock.restore();
  }
  assert.equal(w.state.rows.length, 0);
});

test('the confirm email in the function is identical to the one in build-email.mjs', () => {
  const link = 'https://bubblotics.ca/newsletter/confirm/?t=abcDEF123_-abcDEF123_-abcDEF123_-abcDE';
  const fromFunction = confirmEmail(link);
  const fromBuild = buildConfirmEmail({ link });
  assert.equal(fromFunction.subject, fromBuild.subject);
  assert.equal(fromFunction.html, fromBuild.html);
  assert.equal(fromFunction.text, fromBuild.text);
});
