/*
 * Builds the two emails the newsletter sends: the confirm email, which the
 * sign-up function sends on its own, and the monthly digest, which the
 * monthly job sends through Resend.
 *
 * These functions only build text. They never call the network, so the tests
 * can check the exact HTML and text. Nothing here reads the clock, so the same
 * input always gives the same email.
 *
 * The confirm email is built again by supabase/functions/newsletter-signup,
 * because that file cannot import this one. The tests compare the two.
 */

// The public address of every photo starts with this. A cover is used only
// when it starts with it, so an issue cannot pull in a picture from elsewhere.
export const PHOTO_PREFIX =
  'https://hhxwvxzlykycnuzkjccn.supabase.co/storage/v1/object/public/newsletters/';

export const SITE_URL = 'https://bubblotics.ca';

const SENDER_NAME = 'Bubblotics';
/*
 * The team's contact address, shown in the footer of both emails. It moves to
 * team@bubblotics.ca once that inbox exists. The sign-up function keeps its own
 * copy of this value, and the tests check that the two agree.
 */
export const CONTACT_EMAIL = 'bubblotics@gmail.com';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/*
 * The month before the one that is `now` in `tz`. The job runs on the 1st, so
 * the previous month is the one that has just finished. Intl reads the date in
 * the team's time zone, so a run late on the 31st still counts that month.
 */
export function previousMonth(now = new Date(), tz = 'America/Toronto') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/*
 * The first day of a month, and the first day of the month after it. Issues
 * are picked with gte from and lt to, so an issue on the last day is included
 * and one on the 1st of the next month is not. Dec rolls over to Jan.
 */
export function monthRange(month) {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`Not a month: ${month}`);
  }
  const [year, mon] = month.split('-').map(Number);
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMonth = mon === 12 ? 1 : mon + 1;
  return {
    from: `${year}-${String(mon).padStart(2, '0')}-01`,
    to: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

/* 'YYYY-MM' to 'October 2026', in UTC so the month never shifts. */
export function formatMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/*
 * 'YYYY-MM-DD' to 'October 24, 2026'. The date has no time, so it is read as
 * midnight UTC and formatted in UTC. This is the same rule as formatDate() in
 * src/lib/paths.ts, so the email and the website show the same date.
 */
export function formatIssueDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/*
 * Escapes text for an HTML page. Every value that came from the database is
 * passed through this, because titles and summaries are typed by the team and
 * could contain anything, including markup.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Titles in the hidden preview line: "A", "A and B", "A, B and C". */
function joinTitles(titles) {
  if (titles.length <= 1) return titles.join('');
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`;
}

/*
 * The frame both emails share: a navy band with the logo, a white card, and a
 * footer. Tables and inline styles, because mail clients ignore most other CSS.
 * The supabase function keeps a copy of this; keep the two identical.
 */
function page({ subject, preheader, content, footer, logoUrl }) {
  const pre = preheader
    ? `<div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;color:#eff2f1;mso-hide:all;">${escapeHtml(preheader)}</div>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eff2f1;">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff2f1;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;">
<tr><td style="background:#102542;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${logoUrl}" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;"></td>
<td style="vertical-align:middle;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#fcfaf9;">${SENDER_NAME}</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#102542;">
${content}
</td></tr>
<tr><td style="padding:16px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#4a5b70;">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/*
 * The confirm email. Its text is copied byte for byte into
 * supabase/functions/newsletter-signup/index.ts. A test checks that both give
 * the same HTML.
 */
export function buildConfirmEmail({ link }) {
  const safeLink = escapeHtml(link);
  const content = `
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#102542;">Confirm your subscription</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#1d2b3f;">Tap the button to get the Bubblotics newsletter by email once a month.</p>
<p style="margin:0 0 28px;"><a href="${safeLink}" style="display:inline-block;background:#fec601;color:#102542;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:16px;">Confirm subscription</a></p>
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#4a5b70;">Button not working? Paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeLink}" style="color:#3d72c4;">${safeLink}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#4a5b70;">Didn't sign up? Ignore this email and you won't hear from us.</p>`;
  const footer = `<p style="margin:0 0 4px;">Bubblotics, FTC Team 35858, Aurora, Ontario</p>
<p style="margin:0;"><a href="mailto:${CONTACT_EMAIL}" style="color:#3d72c4;">${CONTACT_EMAIL}</a> &nbsp; <a href="${SITE_URL}" style="color:#3d72c4;">bubblotics.ca</a></p>`;

  const subject = 'Confirm your Bubblotics newsletter subscription';
  const html = page({ subject, preheader: '', content, footer, logoUrl: `${SITE_URL}/apple-touch-icon.png` });
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
  return { subject, html, text };
}

/* One issue as the monthly email shows it. The cover is used only from our bucket. */
function issueHtml(issue, siteUrl) {
  const href = `${siteUrl}/newsletter/issue/?n=${encodeURIComponent(issue.slug)}`;
  const hasCover = typeof issue.cover_url === 'string' && issue.cover_url.startsWith(PHOTO_PREFIX);
  const cover = hasCover
    ? `<img src="${escapeHtml(issue.cover_url)}" width="536" alt="${escapeHtml(issue.title)}" style="display:block;width:100%;height:auto;border:0;border-radius:12px;margin:0 0 20px;">`
    : '';
  const summary = issue.summary
    ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#1d2b3f;">${escapeHtml(issue.summary)}</p>`
    : '';
  return `<tr><td style="padding:0 0 36px;">
${cover}
<h2 style="margin:0 0 6px;font-size:22px;line-height:1.25;color:#102542;">${escapeHtml(issue.title)}</h2>
<p style="margin:0 0 12px;font-size:14px;color:#4a5b70;">${escapeHtml(formatIssueDate(issue.issue_date))}</p>
${summary}
<p style="margin:0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#fec601;color:#102542;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:16px;">Read the issue</a></p>
</td></tr>`;
}

function issueText(issue, siteUrl) {
  const href = `${siteUrl}/newsletter/issue/?n=${encodeURIComponent(issue.slug)}`;
  const lines = [issue.title, formatIssueDate(issue.issue_date)];
  if (issue.summary) lines.push(issue.summary);
  lines.push('Read the issue', href);
  return lines.join('\n');
}

/*
 * The monthly digest for one month. Returns null when there are no issues, so
 * the caller can send nothing. The name is the Resend broadcast name, which the
 * job uses to notice a month that already went out.
 */
export function buildMonthlyEmail({ month, issues, siteUrl = SITE_URL }) {
  if (!issues || issues.length === 0) return null;

  const monthLabel = formatMonth(month);
  const subject = `Bubblotics newsletter, ${monthLabel}`;
  const preheader = joinTitles(issues.map((issue) => issue.title));

  const content = `<p style="margin:0 0 4px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:#3d72c4;">Newsletter</p>
<h1 style="margin:0 0 28px;font-size:28px;line-height:1.2;color:#102542;">${escapeHtml(monthLabel)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${issues.map((issue) => issueHtml(issue, siteUrl)).join('\n')}
</table>`;

  const footer = `<p style="margin:0 0 4px;">Bubblotics, FTC Team 35858, Aurora, Ontario</p>
<p style="margin:0 0 12px;"><a href="mailto:${CONTACT_EMAIL}" style="color:#3d72c4;">${CONTACT_EMAIL}</a> &nbsp; <a href="${SITE_URL}" style="color:#3d72c4;">bubblotics.ca</a></p>
<p style="margin:0 0 4px;">You're getting this because you signed up at bubblotics.ca.</p>
<p style="margin:0;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#3d72c4;">Unsubscribe</a></p>`;

  const html = page({ subject, preheader, content, footer, logoUrl: `${siteUrl}/apple-touch-icon.png` });

  const text = [
    'Newsletter',
    monthLabel,
    '',
    ...issues.map((issue) => `${issueText(issue, siteUrl)}\n`),
    'Bubblotics, FTC Team 35858, Aurora, Ontario',
    CONTACT_EMAIL,
    'bubblotics.ca',
    "You're getting this because you signed up at bubblotics.ca.",
    'Unsubscribe',
    '{{{RESEND_UNSUBSCRIBE_URL}}}',
  ].join('\n');

  return { name: `newsletter-${month}`, subject, html, text, preheader };
}
