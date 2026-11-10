/*
 * Runs the "Get it by email" form. The address is checked here first, so an
 * obvious typo is answered at once without a round trip. The function checks it
 * again, because the browser's check is only a convenience.
 *
 * The status line is the one place the form speaks. It has role="status", so a
 * screen reader announces each change without the focus moving.
 */

import { subscribe, type SubscribeResult } from '../lib/newsletter';

// The same shape the function accepts, so the two never disagree on what is valid.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const MESSAGES = {
  sending: 'Sending...',
  success: 'Check your inbox for a confirm link.',
  invalid: "That doesn't look like an email address.",
  busy: 'Too many sign-ups right now. Try again in an hour.',
  failed: "Couldn't sign you up right now. Try again later.",
};

type GoatCounter = { count?: (vars: { path: string; event?: boolean }) => void };

/*
 * Counts a sign-up as a page event, so the team can see how many people sign
 * up. The path carries no address, because an address is personal data and the
 * counter must not hold one.
 */
function countSignup(): void {
  const counter = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
  counter?.count?.({ path: 'newsletter/subscribed', event: true });
}

function messageFor(result: SubscribeResult): string {
  if (result.ok) return MESSAGES.success;
  if (result.error === 'invalid_email') return MESSAGES.invalid;
  if (result.error === 'busy') return MESSAGES.busy;
  return MESSAGES.failed;
}

function wire(form: HTMLFormElement): void {
  const email = form.querySelector<HTMLInputElement>('input[name="email"]');
  const honeypot = form.querySelector<HTMLInputElement>('input[name="website"]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = form.querySelector<HTMLElement>('.newsletter-signup-status');
  if (!email || !honeypot || !button || !status) return;

  const say = (text: string, isError = false): void => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const address = email.value.trim();

    if (!EMAIL.test(address) || address.length > 254) {
      say(MESSAGES.invalid, true);
      email.focus();
      return;
    }

    button.disabled = true;
    say(MESSAGES.sending);
    const result = await subscribe(address, honeypot.value);
    button.disabled = false;

    if (result.ok) {
      form.reset();
      say(MESSAGES.success);
      countSignup();
      return;
    }
    say(messageFor(result), true);
  });
}

document.querySelectorAll<HTMLFormElement>('.newsletter-signup-form').forEach(wire);
