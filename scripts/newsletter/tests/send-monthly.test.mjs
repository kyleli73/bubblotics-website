import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../send-monthly.mjs';

const KEY = 're_TEST_only_key';
const NOW = new Date('2026-11-01T14:00:00Z');
const ISSUE = {
  title: 'Robots on the move',
  issue_date: '2026-10-24',
  slug: '2026-10-24-robots-on-the-move',
  summary: 'A summary.',
  cover_url: null,
};

const BASE_ENV = {
  MODE: 'draft',
  AUDIENCE: 'test',
  RESEND_API_KEY: KEY,
  RESEND_SEGMENT_ID: 'seg_everyone',
  RESEND_TEST_SEGMENT_ID: 'seg_test',
  NEWSLETTER_MAILING_ADDRESS: 'Bubblotics, Aurora, Ontario, Canada',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/*
 * A stand-in for fetch that answers the three calls the job makes and records
 * every call, so each test can check what was asked and what was sent.
 */
function world({ issues = [ISSUE], broadcasts = { data: [], has_more: false }, createStatus = 200 } = {}) {
  const calls = [];
  const logs = [];
  const errors = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (url.includes('/rest/v1/newsletters')) return jsonResponse(issues);
    if (url.endsWith('/broadcasts') && method === 'GET') return jsonResponse(broadcasts);
    if (url.endsWith('/broadcasts') && method === 'POST') {
      return jsonResponse({ id: 'bc_123' }, createStatus);
    }
    return new Response('not found', { status: 404 });
  };
  const deps = {
    fetch,
    now: () => NOW,
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
    supabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'sb_publishable_TEST_only' }),
  };
  return { deps, calls, logs, errors, posts: () => calls.filter((c) => c.method === 'POST') };
}

test('no issues in the month means no broadcast and exit 0', async () => {
  const w = world({ issues: [] });
  const code = await main(BASE_ENV, w.deps);
  assert.equal(code, 0);
  assert.equal(w.posts().length, 0);
  assert.deepEqual(w.logs, ['No issues in 2026-10, nothing to send.']);
});

test('a draft to the test segment is saved with send false', async () => {
  const w = world();
  const code = await main(BASE_ENV, w.deps);
  assert.equal(code, 0);
  const [post] = w.posts();
  assert.equal(post.body.send, false);
  assert.equal(post.body.segment_id, 'seg_test');
  assert.match(post.body.name, /^newsletter-2026-10-test-\d+$/);
  assert.equal(post.body.from, 'Bubblotics <newsletter@bubblotics.ca>');
  assert.equal(post.body.reply_to, 'bubblotics@gmail.com');
});

test('a send to everyone uses the everyone segment and the month name', async () => {
  const w = world();
  const code = await main({ ...BASE_ENV, MODE: 'send', AUDIENCE: 'everyone' }, w.deps);
  assert.equal(code, 0);
  const [post] = w.posts();
  assert.equal(post.body.send, true);
  assert.equal(post.body.segment_id, 'seg_everyone');
  assert.equal(post.body.name, 'newsletter-2026-10');
  assert.ok(post.body.html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}'));
});

test('a send to everyone without a mailing address is refused before any broadcast', async () => {
  const w = world();
  const env = { ...BASE_ENV, MODE: 'send', AUDIENCE: 'everyone', NEWSLETTER_MAILING_ADDRESS: '' };
  const code = await main(env, w.deps);
  assert.equal(code, 1);
  assert.equal(w.posts().length, 0);
  assert.equal(
    w.errors[0],
    'Set the NEWSLETTER_MAILING_ADDRESS variable before sending to subscribers. Canada\'s anti-spam law requires a mailing address in every newsletter.',
  );
});

test('a test send may go out without a mailing address, with the placeholder in the footer', async () => {
  const w = world();
  const env = { ...BASE_ENV, MODE: 'send', NEWSLETTER_MAILING_ADDRESS: '' };
  assert.equal(await main(env, w.deps), 0);
  assert.ok(w.posts()[0].body.html.includes('[mailing address missing]'));
});

test('a month that already went out is skipped, but a draft does not count', async () => {
  const sent = world({ broadcasts: { data: [{ name: 'newsletter-2026-10', status: 'sent' }], has_more: false } });
  assert.equal(await main({ ...BASE_ENV, MODE: 'send', AUDIENCE: 'everyone' }, sent.deps), 0);
  assert.deepEqual(sent.logs, ['Already sent for 2026-10.']);
  assert.equal(sent.posts().length, 0);

  const draft = world({ broadcasts: { data: [{ name: 'newsletter-2026-10', status: 'draft' }], has_more: false } });
  assert.equal(await main({ ...BASE_ENV, MODE: 'send', AUDIENCE: 'everyone' }, draft.deps), 0);
  assert.equal(draft.posts().length, 1);
});

test('when the broadcast list has more pages, the job stops rather than guess', async () => {
  const w = world({ broadcasts: { data: [], has_more: true } });
  const code = await main({ ...BASE_ENV, MODE: 'send', AUDIENCE: 'everyone' }, w.deps);
  assert.equal(code, 1);
  assert.equal(w.posts().length, 0);
});

test('the test audience picks the test segment and never checks for a previous send', async () => {
  const w = world({ broadcasts: { data: [{ name: 'newsletter-2026-10', status: 'sent' }], has_more: false } });
  const code = await main({ ...BASE_ENV, MODE: 'send' }, w.deps);
  assert.equal(code, 0);
  assert.equal(w.posts()[0].body.segment_id, 'seg_test');
  assert.equal(w.calls.filter((c) => c.url.endsWith('/broadcasts') && c.method === 'GET').length, 0);
});

test('a missing segment variable is named and nothing is called', async () => {
  const w = world();
  const env = { ...BASE_ENV, RESEND_TEST_SEGMENT_ID: '' };
  assert.equal(await main(env, w.deps), 1);
  assert.match(w.errors[0], /RESEND_TEST_SEGMENT_ID/);
  assert.equal(w.calls.length, 0);
});

test('the month option picks the issues from that month, with December rolling into January', async () => {
  const w = world();
  await main({ ...BASE_ENV, MONTH: '2026-12' }, w.deps);
  const read = w.calls.find((c) => c.url.includes('/rest/v1/newsletters'));
  assert.ok(read.url.includes('issue_date=gte.2026-12-01'));
  assert.ok(read.url.includes('issue_date=lt.2027-01-01'));
});

test('an invalid mode or audience is refused before anything is called', async () => {
  const w = world();
  assert.equal(await main({ ...BASE_ENV, MODE: 'blast' }, w.deps), 1);
  assert.equal(await main({ ...BASE_ENV, AUDIENCE: 'everybody' }, w.deps), 1);
  assert.equal(w.calls.length, 0);
});

test('the Resend key never appears in logs or errors', async () => {
  const w = world({ createStatus: 500 });
  const code = await main(BASE_ENV, w.deps);
  assert.equal(code, 1);
  const everything = [...w.logs, ...w.errors].join('\n');
  assert.ok(!everything.includes(KEY));
});
