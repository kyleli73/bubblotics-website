/*
 * Fills the newsletter page with the issues from Supabase.
 *
 * The list is fetched here, in the browser, rather than at build time. An
 * issue published from the team page then appears here straight away, with no
 * site rebuild. The page itself is static HTML with a loading skeleton, and this
 * script replaces that skeleton with the real content.
 *
 * Each issue opens on its own page (newsletter/issue), which is where the
 * article is rendered. This page only shows what a list needs.
 */

import { issueHref, listNewsletters, PHOTO_PREFIX, type NewsletterSummary } from '../lib/newsletter';
import { el } from '../lib/dom';
import { formatDate } from '../lib/paths';

const root = document.getElementById('newsletter-root');

/*
 * The cover is the first photo of the issue. The database already limits it to
 * this project's bucket, and this checks it again before it goes in an img.
 */
function coverPhoto(issue: NewsletterSummary): HTMLImageElement | null {
  if (!issue.cover_url || !issue.cover_url.startsWith(PHOTO_PREFIX)) return null;
  const img = el('img', 'newsletter-cover');
  img.src = issue.cover_url;
  // Decorative: the title sits right beside it, so the photo needs no alt text.
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

function featured(issue: NewsletterSummary): HTMLElement {
  const card = el('article', 'newsletter-featured');
  const text = el('div', 'newsletter-featured-text');
  text.append(
    el('h2', 'newsletter-title', issue.title),
    el('p', 'newsletter-date', formatDate(new Date(issue.issue_date)))
  );
  if (issue.summary) {
    text.append(el('p', 'newsletter-summary', issue.summary));
  }
  const read = el('a', 'btn btn-primary', 'Read the issue');
  read.href = issueHref(issue.slug);
  text.append(read);

  const cover = coverPhoto(issue);
  if (cover) card.append(cover);
  card.append(text);
  return card;
}

function earlier(issues: NewsletterSummary[]): HTMLElement {
  const section = el('section', 'newsletter-earlier');
  section.setAttribute('aria-labelledby', 'newsletter-earlier-title');
  const heading = el('h2', 'newsletter-earlier-title', 'Earlier issues');
  heading.id = 'newsletter-earlier-title';

  const list = el('ul', 'newsletter-list');
  for (const issue of issues) {
    // The whole row is the link, so the target is as large as the row.
    const item = el('li');
    const row = el('a', 'newsletter-row');
    row.href = issueHref(issue.slug);
    row.append(
      el('span', 'newsletter-row-title', issue.title),
      el('span', 'newsletter-row-date', formatDate(new Date(issue.issue_date)))
    );
    item.append(row);
    list.append(item);
  }

  section.append(heading, list);
  return section;
}

function message(text: string, isError = false): HTMLElement {
  return el('p', isError ? 'newsletter-message newsletter-message-error' : 'newsletter-message', text);
}

async function load(): Promise<void> {
  if (!root) return;

  try {
    const issues = await listNewsletters();
    if (issues.length === 0) {
      root.replaceChildren(message('No issues yet.'));
      return;
    }

    const [newest, ...rest] = issues;
    const nodes: HTMLElement[] = [featured(newest)];
    if (rest.length > 0) nodes.push(earlier(rest));
    root.replaceChildren(...nodes);
  } catch (err) {
    // The reader sees a plain sentence. The console keeps the detail for
    // whoever is debugging a broken connection.
    console.error('Could not load newsletters:', err);
    root.replaceChildren(message("Couldn't load the newsletters right now.", true));
  }
}

load();
