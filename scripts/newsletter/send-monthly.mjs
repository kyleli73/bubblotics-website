/*
 * Sends the monthly newsletter email. It runs in GitHub Actions on the 1st of
 * each month (see .github/workflows/monthly-newsletter.yml), and it can also
 * run by hand to make a test or a draft.
 *
 * It reads last month's issues from Supabase, builds one digest, and creates a
 * Resend broadcast to the segment. Resend then does the sending and handles
 * unsubscribes. Nothing here loops over people, so the list stays in Resend.
 *
 * Settings come in through environment variables, so the same script serves
 * the scheduled run, a manual test, and a manual draft. Missing settings fail
 * before anything is sent.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildMonthlyEmail, monthRange, previousMonth, SITE_URL } from './build-email.mjs';

const RESEND_API = 'https://api.resend.com';
const SENDER = 'Bubblotics <newsletter@bubblotics.ca>';
const REPLY_TO = 'bubblotics@gmail.com';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/*
 * The Supabase address and publishable key already live in src/lib/newsletter.ts.
 * The key is public by design, since every page of the site uses it. The script
 * reads it from there instead of keeping a second copy in this folder.
 */
function readSupabaseConfig() {
  const source = readFileSync(new URL('../../src/lib/newsletter.ts', import.meta.url), 'utf8');
  const url = source.match(/SUPABASE_URL = '([^']+)'/);
  const key = source.match(/SUPABASE_PUBLISHABLE_KEY = '([^']+)'/);
  if (!url || !key) {
    throw new Error('Could not find the Supabase settings in src/lib/newsletter.ts.');
  }
  return { url: url[1], key: key[1] };
}

function defaultDeps() {
  return {
    fetch: (input, init) => fetch(input, init),
    now: () => new Date(),
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    supabaseConfig: readSupabaseConfig,
  };
}

/*
 * One Resend API call. The key is sent as a bearer header and never printed.
 * Errors name the call and the status only.
 */
async function resend(deps, apiKey, method, path, body) {
  const res = await deps.fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Resend ${method} ${path} returned ${res.status}.`);
  }
  return res.json();
}

async function fetchIssues(deps, month) {
  const { url, key } = deps.supabaseConfig();
  const { from, to } = monthRange(month);
  const query = `select=title,issue_date,slug,summary,cover_url&issue_date=gte.${from}&issue_date=lt.${to}&order=issue_date.asc`;
  const res = await deps.fetch(`${url}/rest/v1/newsletters?${query}`, {
    headers: { apikey: key },
  });
  if (!res.ok) {
    throw new Error(`Supabase returned ${res.status} when reading the issues.`);
  }
  return res.json();
}

/*
 * True when a broadcast with this name has already gone out, or is scheduled
 * to. A draft does not count. If the list has more pages than this call reads,
 * the answer is not known, and the caller stops rather than risk a second send.
 */
async function alreadySent(deps, apiKey, name) {
  const list = await resend(deps, apiKey, 'GET', '/broadcasts');
  const match = list.data.some((broadcast) => broadcast.name === name && broadcast.status !== 'draft');
  if (match) return { sent: true };
  if (list.has_more) return { unknown: true };
  return { sent: false };
}

/*
 * Runs one job. Returns the exit code: 0 for success or nothing to do, 1 for a
 * refused or failed run. The caller sets the process exit code from it, so a
 * failed run turns the GitHub Actions job red and GitHub emails the owner.
 */
export async function main(env, deps = defaultDeps()) {
  const mode = env.MODE || 'draft';
  const audience = env.AUDIENCE || 'test';

  if (mode !== 'send' && mode !== 'draft') {
    deps.error('MODE must be send or draft.');
    return 1;
  }
  if (audience !== 'everyone' && audience !== 'test') {
    deps.error('AUDIENCE must be everyone or test.');
    return 1;
  }

  let month;
  try {
    month = env.MONTH ? env.MONTH : previousMonth(deps.now());
    if (!MONTH_PATTERN.test(month)) {
      deps.error('MONTH must look like 2026-10.');
      return 1;
    }
  } catch (err) {
    deps.error(err.message);
    return 1;
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    deps.error('Set the RESEND_API_KEY secret.');
    return 1;
  }
  const segmentName = audience === 'everyone' ? 'RESEND_SEGMENT_ID' : 'RESEND_TEST_SEGMENT_ID';
  const segmentId = env[segmentName];
  if (!segmentId) {
    deps.error(`Set the ${segmentName} secret.`);
    return 1;
  }

  try {
    const issues = await fetchIssues(deps, month);
    if (issues.length === 0) {
      deps.log(`No issues in ${month}, nothing to send.`);
      return 0;
    }

    const mailingAddress = env.NEWSLETTER_MAILING_ADDRESS || '';
    if (mode === 'send' && audience === 'everyone' && !mailingAddress) {
      deps.error(
        'Set the NEWSLETTER_MAILING_ADDRESS variable before sending to subscribers. Canada\'s anti-spam law requires a mailing address in every newsletter.',
      );
      return 1;
    }

    const email = buildMonthlyEmail({ month, issues, siteUrl: SITE_URL, mailingAddress });
    if (!email) {
      deps.log(`No issues in ${month}, nothing to send.`);
      return 0;
    }

    // Test runs get a unique name each time, so they never block the real send.
    const name = audience === 'everyone' ? email.name : `${email.name}-test-${deps.now().getTime()}`;

    if (audience === 'everyone') {
      const check = await alreadySent(deps, apiKey, email.name);
      if (check.sent) {
        deps.log(`Already sent for ${month}.`);
        return 0;
      }
      if (check.unknown) {
        deps.error('Resend has more broadcasts than this job reads, so it cannot tell whether this month already went out. Nothing was sent.');
        return 1;
      }
    }

    const broadcast = await resend(deps, apiKey, 'POST', '/broadcasts', {
      segment_id: segmentId,
      from: SENDER,
      reply_to: REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
      name,
      send: mode === 'send',
    });
    const status = broadcast.status ?? (mode === 'send' ? 'sending' : 'draft');
    deps.log(`Broadcast ${broadcast.id} (${name}) status: ${status}.`);
    return 0;
  } catch (err) {
    deps.error(err.message);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  process.exitCode = await main(process.env);
}
