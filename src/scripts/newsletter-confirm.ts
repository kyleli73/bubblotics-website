/*
 * Runs the confirm page. The token arrives in the address (?t=...), is sent once
 * to the function, and is then removed from the address bar, so it is not left
 * in the history or copied along with the link.
 */

import { el } from '../lib/dom';
import { confirmSubscription, type ConfirmResult } from '../lib/newsletter';
import { url } from '../lib/paths';

const title = document.getElementById('confirm-title');
const next = document.getElementById('confirm-next');

function show(heading: string, link?: { href: string; text: string }): void {
  if (title) title.textContent = heading;
  if (!next) return;
  if (link) {
    const anchor = el('a', 'link-arrow', link.text);
    anchor.href = link.href;
    next.replaceChildren(anchor);
  } else {
    next.replaceChildren();
  }
}

function render(result: ConfirmResult): void {
  if (result.ok) {
    show("You're subscribed.", { href: url('/newsletter/'), text: 'Back to the newsletter' });
  } else if (result.error === 'expired') {
    show('This link has expired or was already used.', { href: url('/newsletter/'), text: 'Sign up again' });
  } else {
    show("Couldn't confirm right now. Try the link again later.");
  }
}

async function run(): Promise<void> {
  const token = new URLSearchParams(window.location.search).get('t') ?? '';
  const result: ConfirmResult = token
    ? await confirmSubscription(token)
    // A missing token gets the same answer as a used one, the same as the function.
    : { ok: false, error: 'expired' };

  history.replaceState(null, '', window.location.pathname);
  render(result);
}

run();
