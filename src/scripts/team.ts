/*
 * The newsletter manager on the team page.
 *
 * One shared account signs in here, then uploads, edits, replaces and deletes
 * issues. Every check in this file is a convenience: it gives a plain sentence
 * before a slow upload, and it keeps the page from offering a button that
 * cannot work. The rules that actually stop a stranger are in
 * supabase/newsletters.sql, and they hold even if this script is changed or
 * bypassed.
 */

import {
  BUCKET,
  checkPdf,
  describeError,
  isIsoDate,
  listNewsletters,
  makeFilePath,
  pdfUrl,
  resolveUsername,
  signInMessage,
  supabase,
  type Newsletter,
} from '../lib/newsletter';
import { formatDate } from '../lib/paths';

/* Looks an element up by id and fails loudly if the page is missing it. */
function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`The team page is missing #${id}`);
  return node as T;
}

const checking = must<HTMLElement>('team-checking');
const signin = must<HTMLElement>('team-signin');
const signinForm = must<HTMLFormElement>('team-signin-form');
const usernameInput = must<HTMLInputElement>('ts-user');
const passwordInput = must<HTMLInputElement>('ts-pass');
const signinStatus = must<HTMLElement>('ts-status');
const signinSubmit = must<HTMLButtonElement>('ts-submit');

const manager = must<HTMLElement>('team-manager');
const signoutButton = must<HTMLButtonElement>('team-signout');
const newForm = must<HTMLFormElement>('team-new-form');
const newTitle = must<HTMLInputElement>('tn-title');
const newDate = must<HTMLInputElement>('tn-date');
const newFile = must<HTMLInputElement>('tn-file');
const newSubmit = must<HTMLButtonElement>('tn-submit');
const newStatus = must<HTMLElement>('tn-status');
const listStatus = must<HTMLElement>('team-list-status');
const issuesList = must<HTMLUListElement>('team-issues');

function setStatus(node: HTMLElement, text: string, isError = false): void {
  node.textContent = text;
  node.classList.toggle('is-error', isError);
}

function setBusy(button: HTMLButtonElement, busy: boolean): void {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

/* Today's date in the browser's own time zone, as YYYY-MM-DD. */
function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/*
 * The title as it will be stored, or null if it is not usable. Length counts
 * characters, not UTF-16 units, so it matches the table's char_length check.
 */
function cleanTitle(raw: string): string | null {
  const title = raw.trim();
  const length = [...title].length;
  return length >= 1 && length <= 120 ? title : null;
}

/*
 * Whether a row already points at this file. Used after a write reports an
 * error: the write may have landed anyway, and deleting a file that a row uses
 * would leave a published issue with a dead PDF link. Returns null when the
 * answer is unknown.
 */
async function rowPointsAt(path: string): Promise<boolean | null> {
  const { data, error } = await supabase()
    .from('newsletters')
    .select('id')
    .eq('file_path', path);
  if (error || !data) return null;
  return data.length > 0;
}

function showSignIn(message = '', isError = false): void {
  checking.hidden = true;
  manager.hidden = true;
  signin.hidden = false;
  setStatus(signinStatus, message, isError);
}

async function showManager(): Promise<void> {
  checking.hidden = true;
  signin.hidden = true;
  manager.hidden = false;
  if (!newDate.value) newDate.value = todayLocal();
  await refreshList();
}

/*
 * Signed in is not the same as allowed. The database answers the editor
 * question with is_newsletter_editor(), so a valid account that is not the
 * newsletter account is turned away and signed out here.
 */
async function enterManager(): Promise<void> {
  const { data, error } = await supabase().rpc('is_newsletter_editor');
  if (error) {
    showSignIn(describeError(error, "Couldn't check this account's access. Try again."), true);
    return;
  }
  if (data !== true) {
    await supabase().auth.signOut();
    showSignIn("This account can't edit newsletters.", true);
    return;
  }
  await showManager();
}

async function refreshList(): Promise<void> {
  setStatus(listStatus, 'Loading issues…');
  try {
    const issues = await listNewsletters();
    issuesList.replaceChildren(...issues.map(issueRow));
    setStatus(listStatus, issues.length === 0 ? 'No issues yet.' : '');
  } catch (err) {
    console.error('Could not load newsletters for the manager:', err);
    issuesList.replaceChildren();
    setStatus(listStatus, describeError(err, "Couldn't load the issues. Try again."), true);
  }
}

/* ── New issue ─────────────────────────────────────────────────────────── */

signinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const resolved = resolveUsername(usernameInput.value);
  if (!resolved.ok) {
    setStatus(signinStatus, resolved.error, true);
    return;
  }
  if (!passwordInput.value) {
    setStatus(signinStatus, 'Enter the password.', true);
    return;
  }

  // Taken out of the field before the request, so it is not left sitting in
  // the form while the network call is in flight. It is never stored or logged.
  const password = passwordInput.value;
  passwordInput.value = '';
  setBusy(signinSubmit, true);
  setStatus(signinStatus, '');

  const { error } = await supabase().auth.signInWithPassword({
    email: resolved.email,
    password,
  });
  setBusy(signinSubmit, false);

  if (error) {
    setStatus(signinStatus, signInMessage(error), true);
    return;
  }
  await enterManager();
});

signoutButton.addEventListener('click', async () => {
  setBusy(signoutButton, true);
  const { error } = await supabase().auth.signOut();
  setBusy(signoutButton, false);
  issuesList.replaceChildren();
  manager.hidden = true;
  showSignIn(
    error ? describeError(error, "Couldn't sign out. Try again.") : '',
    Boolean(error)
  );
});

newForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = cleanTitle(newTitle.value);
  if (!title) {
    setStatus(newStatus, 'Give the issue a title of 1 to 120 characters.', true);
    return;
  }
  if (!isIsoDate(newDate.value)) {
    setStatus(newStatus, 'Choose the issue date.', true);
    return;
  }
  const file = newFile.files?.[0];
  if (!file) {
    setStatus(newStatus, 'Choose a PDF to upload.', true);
    return;
  }

  setStatus(newStatus, 'Checking the file…');
  const problem = await checkPdf(file);
  if (problem) {
    setStatus(newStatus, problem, true);
    return;
  }

  const issueDate = newDate.value;
  const path = makeFilePath(issueDate, title);
  setBusy(newSubmit, true);
  setStatus(newStatus, 'Uploading…');

  // The file goes up first. The row is written second, because the row is what
  // makes an issue appear on the public page.
  const uploaded = await supabase()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: 'application/pdf' });
  if (uploaded.error) {
    setBusy(newSubmit, false);
    setStatus(newStatus, describeError(uploaded.error, "Couldn't upload the PDF. Try again."), true);
    return;
  }

  const inserted = await supabase()
    .from('newsletters')
    .insert({ title, issue_date: issueDate, file_path: path });

  if (inserted.error) {
    const landed = await rowPointsAt(path);
    if (landed === null) {
      // Cannot tell whether the row exists, so the file is kept. Deleting it
      // could break an issue that was saved after all.
      setBusy(newSubmit, false);
      setStatus(
        newStatus,
        "Couldn't confirm whether the issue was saved, so the PDF was kept. Check the list below before uploading again.",
        true
      );
      await refreshList();
      return;
    }
    if (landed === false) {
      // Nothing points at the file, so it is an orphan. Remove it.
      const removed = await supabase().storage.from(BUCKET).remove([path]);
      setBusy(newSubmit, false);
      const note = removed.error ? ' The uploaded PDF could not be removed from storage.' : '';
      setStatus(
        newStatus,
        describeError(inserted.error, "Couldn't save the issue. Nothing was published.") + note,
        true
      );
      return;
    }
    // landed === true: the row was saved after all, so this is a success.
  }

  setBusy(newSubmit, false);
  newStatus.classList.remove('is-error');
  const link = document.createElement('a');
  link.href = pdfUrl(path);
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'View the PDF';
  newStatus.replaceChildren('Published. ', link);

  newForm.reset();
  newDate.value = todayLocal();
  await refreshList();
});

/* ── Published issues ──────────────────────────────────────────────────── */

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function labelled(text: string, id: string, type: string, value: string, max?: number): HTMLElement {
  const wrap = element('div', 'field');
  const label = element('label', undefined, text);
  label.htmlFor = id;
  const input = element('input');
  input.id = id;
  input.type = type;
  input.value = value;
  input.required = true;
  if (max !== undefined) input.maxLength = max;
  wrap.append(label, input);
  return wrap;
}

function issueRow(issue: Newsletter): HTMLLIElement {
  const row = element('li', 'team-issue');
  const rowStatus = element('p', 'form-status');
  rowStatus.setAttribute('role', 'status');
  rowStatus.setAttribute('aria-live', 'polite');

  const details = element('div', 'team-issue-details');
  details.append(
    element('p', 'team-issue-title', issue.title),
    element('p', 'team-issue-date', formatDate(new Date(issue.issue_date)))
  );

  const view = element('a', 'btn btn-ghost btn-sm', 'View');
  view.href = pdfUrl(issue.file_path);
  view.target = '_blank';
  view.rel = 'noopener';

  const editButton = element('button', 'btn btn-ghost btn-sm', 'Edit');
  editButton.type = 'button';
  const replaceButton = element('button', 'btn btn-ghost btn-sm', 'Replace PDF');
  replaceButton.type = 'button';
  const deleteButton = element('button', 'btn btn-ghost btn-sm', 'Delete');
  deleteButton.type = 'button';

  const actions = element('div', 'team-issue-actions');
  actions.append(view, editButton, replaceButton, deleteButton);

  const head = element('div', 'team-issue-head');
  head.append(details, actions);

  // Editing changes the title and date only. The file name keeps the date and
  // title it was uploaded with, which is fine: the path is what readers use.
  const editForm = element('form', 'team-issue-edit');
  editForm.hidden = true;
  editForm.noValidate = true;
  const titleField = labelled('Title', `edit-title-${issue.id}`, 'text', issue.title, 120);
  const dateField = labelled('Issue date', `edit-date-${issue.id}`, 'date', issue.issue_date);
  const titleInput = titleField.querySelector('input') as HTMLInputElement;
  const dateInput = dateField.querySelector('input') as HTMLInputElement;
  const saveButton = element('button', 'btn btn-primary btn-sm', 'Save');
  saveButton.type = 'submit';
  const cancelButton = element('button', 'btn btn-ghost btn-sm', 'Cancel');
  cancelButton.type = 'button';
  const editActions = element('div', 'team-issue-edit-actions');
  editActions.append(saveButton, cancelButton);
  editForm.append(titleField, dateField, editActions);

  const fileInput = element('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf,.pdf';
  fileInput.hidden = true;

  row.append(head, editForm, fileInput, rowStatus);

  // Every button in the row is switched off while one action is running, so
  // two writes to the same issue cannot overlap.
  function rowBusy(busy: boolean): void {
    row.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  }

  editButton.addEventListener('click', () => {
    titleInput.value = issue.title;
    dateInput.value = issue.issue_date;
    editForm.hidden = false;
    titleInput.focus();
  });

  cancelButton.addEventListener('click', () => {
    editForm.hidden = true;
    setStatus(rowStatus, '');
  });

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = cleanTitle(titleInput.value);
    if (!title) {
      setStatus(rowStatus, 'Give the issue a title of 1 to 120 characters.', true);
      return;
    }
    if (!isIsoDate(dateInput.value)) {
      setStatus(rowStatus, 'Choose the issue date.', true);
      return;
    }

    rowBusy(true);
    setStatus(rowStatus, 'Saving…');
    const updated = await supabase()
      .from('newsletters')
      .update({ title, issue_date: dateInput.value })
      .eq('id', issue.id)
      .select('id');

    // An update the database refuses comes back with no error and no rows.
    // Checking for the empty result is what reveals that case.
    if (updated.error || !updated.data || updated.data.length === 0) {
      rowBusy(false);
      setStatus(
        rowStatus,
        describeError(updated.error, "Couldn't save the changes. Try again."),
        true
      );
      return;
    }
    await refreshList();
  });

  replaceButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    const problem = await checkPdf(file);
    if (problem) {
      setStatus(rowStatus, problem, true);
      return;
    }

    // A replacement always gets a new path. Reusing the old one would be
    // hidden by Supabase's CDN, which caches public files by path.
    const newPath = makeFilePath(issue.issue_date, issue.title);
    rowBusy(true);
    setStatus(rowStatus, 'Uploading the new PDF…');

    const uploaded = await supabase()
      .storage.from(BUCKET)
      .upload(newPath, file, { contentType: 'application/pdf' });
    if (uploaded.error) {
      rowBusy(false);
      setStatus(rowStatus, describeError(uploaded.error, "Couldn't upload the PDF. Try again."), true);
      return;
    }

    const pointed = await supabase()
      .from('newsletters')
      .update({ file_path: newPath })
      .eq('id', issue.id)
      .select('id');
    if (pointed.error || !pointed.data || pointed.data.length === 0) {
      const landed = await rowPointsAt(newPath);
      if (landed !== true) {
        if (landed === false) {
          await supabase().storage.from(BUCKET).remove([newPath]);
        }
        rowBusy(false);
        setStatus(
          rowStatus,
          landed === null
            ? "Couldn't confirm the change, so the new PDF was kept. Refresh the list before trying again."
            : describeError(pointed.error, "Couldn't update the issue. The old PDF is still in use."),
          true
        );
        return;
      }
    }

    // The row points at the new file now, so the old one is no longer used.
    const removed = await supabase().storage.from(BUCKET).remove([issue.file_path]);
    await refreshList();
    if (removed.error) {
      setStatus(
        listStatus,
        'The PDF was replaced, but the old file could not be deleted from storage.',
        true
      );
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Delete "${issue.title}"? Its PDF is deleted too, and the public page stops showing it.`)) {
      return;
    }
    rowBusy(true);
    setStatus(rowStatus, 'Deleting…');

    // Row first, file second. If the row cannot be deleted, the file stays,
    // so the issue is never left pointing at a missing PDF.
    const deleted = await supabase()
      .from('newsletters')
      .delete()
      .eq('id', issue.id)
      .select('id');
    if (deleted.error || !deleted.data || deleted.data.length === 0) {
      rowBusy(false);
      setStatus(
        rowStatus,
        describeError(deleted.error, "Couldn't delete the issue. Try again."),
        true
      );
      return;
    }

    const removed = await supabase().storage.from(BUCKET).remove([issue.file_path]);
    await refreshList();
    if (removed.error) {
      setStatus(
        listStatus,
        'The issue was deleted, but its PDF could not be removed from storage.',
        true
      );
    }
  });

  return row;
}

/* ── Start ─────────────────────────────────────────────────────────────── */

async function start(): Promise<void> {
  const { data, error } = await supabase().auth.getSession();
  if (error || !data.session) {
    showSignIn();
    return;
  }
  // A returning editor has a stored session, so this skips the form.
  await enterManager();
}

start().catch((err) => {
  console.error('Could not check the sign-in state:', err);
  showSignIn("Couldn't check your sign-in. Refresh the page to try again.", true);
});
