/*
 * Fills the newsletter page with the issues from Supabase.
 *
 * The list is fetched here, in the browser, rather than at build time. An
 * issue uploaded from the team page then appears on the public page straight
 * away, with no site rebuild. The page itself is static HTML with a loading
 * skeleton, and this script replaces that skeleton with the real content.
 */

import { listNewsletters, pdfUrl, type Newsletter } from '../lib/newsletter';
import { formatDate } from '../lib/paths';

const root = document.getElementById('newsletter-root');

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // textContent, never innerHTML: a title typed by the team is still data.
  if (text !== undefined) node.textContent = text;
  return node;
}

function readLink(href: string, className: string, issueTitle?: string): HTMLAnchorElement {
  const link = el('a', className, 'Read the PDF');
  link.href = href;
  // Opens the PDF in a new tab, so the reader keeps their place on this page.
  link.target = '_blank';
  link.rel = 'noopener';
  if (issueTitle) {
    // Every row says "Read the PDF", so the issue is named for screen reader
    // users. Sighted readers never see this span.
    link.append(el('span', 'sr-only', ` for ${issueTitle}`));
  }
  return link;
}

function featured(issue: Newsletter): HTMLElement {
  const card = el('article', 'newsletter-featured');
  card.append(
    el('h2', 'newsletter-title', issue.title),
    el('p', 'newsletter-date', formatDate(new Date(issue.issue_date))),
    readLink(pdfUrl(issue.file_path), 'btn btn-primary')
  );
  return card;
}

function earlier(issues: Newsletter[]): HTMLElement {
  const section = el('section', 'newsletter-earlier');
  section.setAttribute('aria-labelledby', 'newsletter-earlier-title');
  const heading = el('h2', 'newsletter-earlier-title', 'Earlier issues');
  heading.id = 'newsletter-earlier-title';

  const list = el('ul', 'newsletter-list');
  for (const issue of issues) {
    const row = el('li', 'newsletter-row');
    const details = el('div', 'newsletter-row-details');
    details.append(
      el('span', 'newsletter-row-title', issue.title),
      el('span', 'newsletter-row-date', formatDate(new Date(issue.issue_date)))
    );
    row.append(details, readLink(pdfUrl(issue.file_path), 'btn btn-ghost btn-sm', issue.title));
    list.append(row);
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
