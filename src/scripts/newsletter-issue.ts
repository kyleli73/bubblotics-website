/*
 * Opens one newsletter issue on its own page.
 *
 * The issue is named by the address (?n=<slug>). It is fetched here, with its
 * HTML, and rendered into the article. A slug that does not exist, or that
 * could not be a slug at all, gets a plain "couldn't find" sentence rather than
 * an error page. That way an old link still reads well, and the back link is
 * always there to get the reader out.
 */

import { el } from '../lib/dom';
import { getNewsletter, type Newsletter } from '../lib/newsletter';
import { renderIssue } from '../lib/newsletter-render';
import { formatDate, url } from '../lib/paths';

const root = document.getElementById('issue-root');
const titleNode = document.getElementById('issue-title');
const dateNode = document.getElementById('issue-date');

/*
 * BaseLayout gives every page a title of the form "Page | Bubblotics · Team
 * 35858". The part after the page name is read once, from the server-rendered
 * title, so this page ends its title the same way without importing the whole
 * team data file into this script.
 */
const titleSuffix = (() => {
  const at = document.title.indexOf(' | ');
  return at === -1 ? '' : document.title.slice(at);
})();

// The slug is what the address says, so it is checked before it is sent.
// Anything that cannot match the table's rule is not worth a request.
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 100;

function message(text: string, isError = false): HTMLElement {
  return el('p', isError ? 'issue-message issue-message-error' : 'issue-message', text);
}

/* The title and date above the article. The title is set as text, never HTML. */
function showHeading(issue: Newsletter): void {
  if (titleNode) titleNode.textContent = issue.title;
  if (dateNode) dateNode.textContent = formatDate(new Date(issue.issue_date));
  document.title = `${issue.title}${titleSuffix}`;
}

/*
 * Removes the title and date skeletons when there is no issue to show. The
 * heading falls back to the section name, so the page still has a heading.
 */
function clearHeading(): void {
  if (titleNode) titleNode.textContent = 'Newsletter';
  if (dateNode) dateNode.textContent = '';
}

function showNotFound(): void {
  clearHeading();
  root?.replaceChildren(message("We couldn't find that issue."));
}

async function load(): Promise<void> {
  if (!root) return;

  const slug = new URLSearchParams(window.location.search).get('n');
  if (!slug) {
    // No issue named, so this is the list. replace() keeps the back button
    // from returning to this empty address.
    window.location.replace(url('/newsletter/'));
    return;
  }

  if (!SLUG.test(slug) || slug.length > SLUG_MAX) {
    showNotFound();
    return;
  }

  try {
    const issue = await getNewsletter(slug);
    if (!issue) {
      showNotFound();
      return;
    }
    showHeading(issue);
    root.replaceChildren(renderIssue(issue.body_html));
  } catch (err) {
    // The reader sees a plain sentence. The console keeps the detail for
    // whoever is debugging a broken connection.
    console.error('Could not load the newsletter issue:', err);
    clearHeading();
    root.replaceChildren(message("Couldn't load this issue right now.", true));
  }
}

load();
