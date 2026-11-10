import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfirmEmail,
  buildMonthlyEmail,
  formatIssueDate,
  monthRange,
  PHOTO_PREFIX,
  previousMonth,
} from '../build-email.mjs';

const ISSUE_A = {
  title: 'Robots on the move',
  issue_date: '2026-10-24',
  slug: '2026-10-24-robots-on-the-move',
  summary: 'We drove the robot across the field.',
  cover_url: `${PHOTO_PREFIX}robots-on-the-move/a1b2c3/1.webp`,
};

const ISSUE_B = {
  title: 'Autumn scrimmage',
  issue_date: '2026-10-03',
  slug: '2026-10-03-autumn-scrimmage',
  summary: null,
  cover_url: null,
};

test('previousMonth reads the month that just finished in Toronto', () => {
  // 14:00 UTC on the 1st is 10:00 in Toronto, still the 1st of November.
  assert.equal(previousMonth(new Date('2026-11-01T14:00:00Z')), '2026-10');
  // Just after midnight in Toronto on 1 January 2027 is still December.
  assert.equal(previousMonth(new Date('2027-01-01T05:00:00Z')), '2026-12');
  assert.equal(previousMonth(new Date('2026-03-01T12:00:00Z')), '2026-02');
});

test('monthRange covers the whole month and rolls December into January', () => {
  assert.deepEqual(monthRange('2026-10'), { from: '2026-10-01', to: '2026-11-01' });
  assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', to: '2027-01-01' });
  assert.throws(() => monthRange('2026-13'), /Not a month/);
});

test('formatIssueDate reads the date in UTC so it does not shift a day', () => {
  assert.equal(formatIssueDate('2026-10-24'), 'October 24, 2026');
  assert.equal(formatIssueDate('2027-01-01'), 'January 1, 2027');
});

test('buildMonthlyEmail returns null when there are no issues', () => {
  assert.equal(buildMonthlyEmail({ month: '2026-10', issues: [], mailingAddress: 'x' }), null);
});

test('buildMonthlyEmail names the broadcast and the subject, and joins the preheader', () => {
  const email = buildMonthlyEmail({
    month: '2026-10',
    issues: [ISSUE_B, ISSUE_A],
    siteUrl: 'https://bubblotics.ca',
    mailingAddress: 'Bubblotics, Aurora, Ontario, Canada',
  });
  assert.equal(email.name, 'newsletter-2026-10');
  assert.equal(email.subject, 'Bubblotics newsletter, October 2026');
  assert.equal(email.preheader, 'Autumn scrimmage and Robots on the move');
  assert.ok(email.html.includes('October 2026'));
});

test('the preheader lists three or more titles with commas and a final and', () => {
  const email = buildMonthlyEmail({
    month: '2026-10',
    issues: [ISSUE_B, ISSUE_A, { ...ISSUE_B, title: 'Third one', slug: 'third' }],
    mailingAddress: 'x',
  });
  assert.equal(email.preheader, 'Autumn scrimmage, Robots on the move and Third one');
});

test('titles from the database are escaped, never written as markup', () => {
  const hostile = { ...ISSUE_B, title: '<img src=x onerror=alert(1)>', summary: '<b>bold</b>' };
  const email = buildMonthlyEmail({ month: '2026-10', issues: [hostile], mailingAddress: 'x' });
  assert.ok(!email.html.includes('<img src=x'), 'raw tag must not appear in the HTML');
  assert.ok(!email.html.includes('<b>bold</b>'), 'raw summary markup must not appear');
  assert.ok(email.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(email.html.includes('&lt;b&gt;bold&lt;/b&gt;'));
  assert.match(email.html, /mso-hide:all;">&lt;img src=x/, 'the hidden preheader is escaped too');
  assert.ok(email.text.includes('<img src=x onerror=alert(1)>'), 'plain text needs no escaping');
});

test('only covers from the bucket are shown', () => {
  const foreign = { ...ISSUE_B, cover_url: 'https://evil.example.com/tracker.png' };
  const email = buildMonthlyEmail({
    month: '2026-10',
    issues: [ISSUE_A, foreign],
    mailingAddress: 'x',
  });
  assert.ok(email.html.includes(`src="${ISSUE_A.cover_url}"`));
  assert.ok(!email.html.includes('evil.example.com'));
  assert.equal(email.html.match(/<img /g).length, 2, 'one cover, plus the logo');
});

test('the unsubscribe placeholder is left for Resend to fill in, in HTML and text', () => {
  const email = buildMonthlyEmail({ month: '2026-10', issues: [ISSUE_A], mailingAddress: 'x' });
  assert.ok(email.html.includes('href="{{{RESEND_UNSUBSCRIBE_URL}}}"'));
  assert.ok(email.text.includes('{{{RESEND_UNSUBSCRIBE_URL}}}'));
});

test('each issue links to its page by slug', () => {
  const email = buildMonthlyEmail({ month: '2026-10', issues: [ISSUE_A], mailingAddress: 'x' });
  assert.ok(email.html.includes(`https://bubblotics.ca/newsletter/issue/?n=${ISSUE_A.slug}`));
  assert.ok(email.text.includes(`https://bubblotics.ca/newsletter/issue/?n=${ISSUE_A.slug}`));
  assert.ok(email.html.includes('Read the issue'));
});

test('a missing mailing address shows the placeholder, so drafts can still be made', () => {
  const email = buildMonthlyEmail({ month: '2026-10', issues: [ISSUE_A], mailingAddress: '' });
  assert.ok(email.html.includes('[mailing address missing]'));
  assert.ok(email.text.includes('[mailing address missing]'));
});

test('the mailing address is escaped like every other value', () => {
  const email = buildMonthlyEmail({ month: '2026-10', issues: [ISSUE_A], mailingAddress: 'A & B <Suite 1>' });
  assert.ok(email.html.includes('A &amp; B &lt;Suite 1&gt;'));
});

test('the confirm email carries its link in the button, the fallback line and the text', () => {
  const link = 'https://bubblotics.ca/newsletter/confirm/?t=abcDEF123_-abcDEF123_-abcDEF123_-abcDE';
  const mail = buildConfirmEmail({ link });
  assert.equal(mail.subject, 'Confirm your Bubblotics newsletter subscription');
  assert.equal(mail.html.split(link).length - 1, 3, 'button, fallback line and fallback link');
  assert.ok(mail.text.includes('Confirm subscription\n' + link));
  assert.ok(mail.html.includes('Confirm your subscription'));
  assert.ok(mail.html.includes("Didn't sign up? Ignore this email and you won't hear from us."));
});
