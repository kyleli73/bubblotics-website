/*
 * The newsletter manager on the team page.
 *
 * One shared account signs in here, then turns a Word file into an issue, checks
 * the preview, and publishes it. Every check in this file is a convenience: it
 * gives a plain sentence before a slow upload, and it keeps the page from
 * offering a button that cannot work. The rules that actually stop a stranger
 * are in supabase/newsletters.sql, and they hold even if this script is changed
 * or bypassed.
 */

import {
  BUCKET,
  checkDocx,
  describeError,
  getNewsletter,
  isIsoDate,
  issueHref,
  listNewsletters,
  makeSlug,
  makeVersion,
  photoPathsIn,
  photoUrl,
  resolveUsername,
  signInMessage,
  supabase,
  type Newsletter,
  type NewsletterSummary,
} from '../lib/newsletter';
import { el } from '../lib/dom';
import { renderIssue } from '../lib/newsletter-render';
import type { ConvertResult, PreparedImage } from '../lib/newsletter-convert';
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
const newPreviewPanel = must<HTMLElement>('tn-preview');
const newWarnings = must<HTMLUListElement>('tn-warnings');
const newPreviewTitle = must<HTMLElement>('tn-preview-title');
const newPreviewDate = must<HTMLElement>('tn-preview-date');
const newArticle = must<HTMLElement>('tn-article');
const newPublish = must<HTMLButtonElement>('tn-publish');
const newCancel = must<HTMLButtonElement>('tn-cancel');
const newPreviewStatus = must<HTMLElement>('tn-preview-status');
const listStatus = must<HTMLElement>('team-list-status');
const issuesList = must<HTMLUListElement>('team-issues');

/* How many photos are sent at once. Enough to be quick, few enough for a phone. */
const UPLOAD_AT_ONCE = 3;

/* Cache life for photos. Their paths never change, so browsers may keep them. */
const PHOTO_CACHE_SECONDS = '31536000';

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

/* ── Photos and previews ──────────────────────────────────────────────── */

/*
 * Reads a Word file into a converted issue. The converter is loaded here, not
 * at the top of the file, so mammoth is only downloaded once someone asks for a
 * preview. Its own errors carry a sentence for the team, and anything else gets
 * the generic one.
 */
async function convertFile(file: File): Promise<ConvertResult> {
  const converter = await import('../lib/newsletter-convert');
  try {
    return await converter.convertDocx(file);
  } catch (err) {
    if (err instanceof converter.ConvertError) throw err;
    console.error('Could not convert the Word file:', err);
    throw new converter.ConvertError("Couldn't read this Word file. Download it again.");
  }
}

/*
 * Each photo in a preview gets a local object URL, keyed by the placeholder
 * the converter wrote into the HTML. The URLs stay valid only until revoked, so
 * every preview that is shown must be released when it goes away.
 */
type Preview = {
  result: ConvertResult;
  urls: Map<string, string>;
};

function makePreview(result: ConvertResult): Preview {
  const urls = new Map<string, string>();
  result.images.forEach((image, index) => {
    urls.set(`nlimg:${index}`, URL.createObjectURL(image.blob));
  });
  return { result, urls };
}

function releasePreview(preview: Preview | null): void {
  if (!preview) return;
  for (const url of preview.urls.values()) URL.revokeObjectURL(url);
}

/* The sentences shown above a preview. Empty means the panel shows none. */
function showWarnings(list: HTMLUListElement, warnings: string[]): void {
  list.replaceChildren(...warnings.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  list.hidden = warnings.length === 0;
}

/*
 * Uploads photos to one new folder, a few at a time. Returns each photo's public
 * address in order. If any upload fails, the photos that did land are removed
 * here, and the sentence to show comes back instead.
 */
async function uploadPhotos(
  slug: string,
  version: string,
  images: PreparedImage[],
  onStart: (started: number) => void
): Promise<{ ok: true; urls: string[]; paths: string[] } | { ok: false; message: string }> {
  const paths = images.map((image, index) => `${slug}/${version}/${index + 1}.${image.ext}`);
  const urls = new Array<string>(images.length);
  const attempted: string[] = [];
  let next = 0;
  let failure: unknown | null = null;

  const worker = async (): Promise<void> => {
    while (failure === null && next < images.length) {
      const index = next++;
      attempted.push(paths[index]);
      onStart(attempted.length);
      const { error } = await supabase()
        .storage.from(BUCKET)
        .upload(paths[index], images[index].blob, {
          contentType: images[index].blob.type,
          cacheControl: PHOTO_CACHE_SECONDS,
        });
      if (error) {
        failure = error;
        return;
      }
      urls[index] = photoUrl(paths[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(UPLOAD_AT_ONCE, images.length) }, () => worker()));
  if (failure === null) return { ok: true, urls, paths: attempted };
  await removePhotos(attempted);
  return { ok: false, message: describeError(failure, "Couldn't upload a photo. Try again.") };
}

/* Removes photos from the bucket. Missing files are fine; the caller decides what a failure means. */
async function removePhotos(paths: string[]): Promise<unknown | null> {
  if (paths.length === 0) return null;
  const { error } = await supabase().storage.from(BUCKET).remove(paths);
  return error ?? null;
}

/*
 * The stored HTML points each photo at its public address. A photo the converter
 * could not read has an empty src, and it is removed here rather than stored. A
 * placeholder with no photo behind it is removed too. DOMParser reads the HTML as
 * a tree, so the attributes change exactly, whatever order they were written in.
 */
function withPhotoAddresses(html: string, urls: string[]): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? '';
    const address = src.startsWith('nlimg:') ? urls[Number(src.slice('nlimg:'.length))] : undefined;
    if (address) img.setAttribute('src', address);
    else img.remove();
  }
  return doc.body.innerHTML;
}

/*
 * The rows that use this slug, with the given columns. Null means the read itself
 * failed, which is different from finding no rows.
 */
async function rowsWithSlug(slug: string, columns: string): Promise<Record<string, unknown>[] | null> {
  const { data, error } = await supabase().from('newsletters').select(columns).eq('slug', slug);
  if (error || !data) return null;
  return data as unknown as Record<string, unknown>[];
}

/*
 * Whether a row already holds this upload. Used after a write reports an error,
 * since the write may have landed anyway, and deleting photos a row uses would
 * leave a published issue with missing pictures. Null means the answer is unknown.
 */
async function rowHasVersion(slug: string, version: string): Promise<boolean | null> {
  const rows = await rowsWithSlug(slug, 'body_html');
  if (rows === null) return null;
  return rows.some((row) => String(row.body_html).includes(`/${slug}/${version}/`));
}

/* ── New issue ─────────────────────────────────────────────────────────── */

/*
 * The issue in the New issue card. Its title and date are kept with the preview,
 * so Publish works from what was previewed rather than reading the form again.
 */
type NewIssue = { title: string; issueDate: string; preview: Preview };
let newIssue: NewIssue | null = null;

/* Hides the preview and frees its photos. Called whenever a field changes. */
function clearNewPreview(): void {
  releasePreview(newIssue?.preview ?? null);
  newIssue = null;
  newPreviewPanel.hidden = true;
  newArticle.replaceChildren();
  setStatus(newPreviewStatus, '');
}

function showNewPreview(issue: NewIssue): void {
  newPreviewTitle.textContent = issue.title;
  newPreviewDate.textContent = formatDate(new Date(issue.issueDate));
  showWarnings(newWarnings, issue.preview.result.warnings);
  newArticle.replaceChildren(renderIssue(issue.preview.result.html, { previewImages: issue.preview.urls }));
  newPreviewPanel.hidden = false;
  newPreviewPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* Changing the title, date or file means the preview no longer matches the form. */
for (const field of [newTitle, newDate, newFile]) {
  field.addEventListener('input', clearNewPreview);
  field.addEventListener('change', clearNewPreview);
}

newForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearNewPreview();

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
    setStatus(newStatus, 'Choose a Word file to preview.', true);
    return;
  }

  setBusy(newSubmit, true);
  setStatus(newStatus, 'Checking the file…');
  const problem = await checkDocx(file);
  if (problem) {
    setBusy(newSubmit, false);
    setStatus(newStatus, problem, true);
    return;
  }

  setStatus(newStatus, 'Reading the file…');
  try {
    const result = await convertFile(file);
    newIssue = { title, issueDate: newDate.value, preview: makePreview(result) };
    setStatus(newStatus, '');
    showNewPreview(newIssue);
  } catch (err) {
    setStatus(newStatus, err instanceof Error ? err.message : "Couldn't read this Word file.", true);
  } finally {
    setBusy(newSubmit, false);
  }
});

newCancel.addEventListener('click', () => {
  clearNewPreview();
  setStatus(newStatus, '');
});

newPublish.addEventListener('click', async () => {
  const issue = newIssue;
  if (!issue) return;
  const { title, issueDate, preview } = issue;

  setBusy(newPublish, true);
  setBusy(newCancel, true);
  setStatus(newPreviewStatus, 'Publishing…');

  const fail = async (message: string, paths: string[] = []) => {
    await removePhotos(paths);
    setBusy(newPublish, false);
    setBusy(newCancel, false);
    setStatus(newPreviewStatus, message, true);
  };

  // The slug is chosen once and never changes, so links people save keep working.
  let slug: string;
  try {
    slug = await makeSlug(issueDate, title);
  } catch (err) {
    console.error('Could not choose the issue address:', err);
    await fail(describeError(err, "Couldn't check the issue address. Try again."));
    return;
  }

  // Photos first. The row is written last, because the row is what makes an
  // issue appear, and it should never point at a photo that is not there yet.
  const upload = await uploadPhotos(slug, makeVersion(), preview.result.images, (started) => {
    setStatus(newPreviewStatus, `Publishing… photo ${started} of ${preview.result.images.length}`);
  });
  if (!upload.ok) {
    await fail(upload.message);
    return;
  }

  const inserted = await supabase()
    .from('newsletters')
    .insert({
      title,
      issue_date: issueDate,
      slug,
      body_html: withPhotoAddresses(preview.result.html, upload.urls),
      summary: preview.result.summary,
      cover_url: upload.urls[0] ?? null,
    });

  if (inserted.error) {
    const rows = await rowsWithSlug(slug, 'id');
    if (rows === null) {
      // Cannot tell whether the row exists, so the photos are kept. Deleting
      // them could break an issue that was saved after all.
      setBusy(newPublish, false);
      setBusy(newCancel, false);
      setStatus(
        newPreviewStatus,
        "Couldn't confirm whether the issue was saved, so the photos were kept. Check the list below before publishing again.",
        true
      );
      await refreshList();
      return;
    }
    if (rows.length === 0) {
      await fail(describeError(inserted.error, "Couldn't save the issue. Nothing was published."), upload.paths);
      return;
    }
    // The row was saved after all, so this is a success and the photos stay.
  }

  // Published. Reset the form and show the link to the new issue.
  releasePreview(preview);
  newIssue = null;
  newPreviewPanel.hidden = true;
  newArticle.replaceChildren();
  setBusy(newPublish, false);
  setBusy(newCancel, false);
  setStatus(newStatus, '');
  newStatus.classList.remove('is-error');
  const link = document.createElement('a');
  link.href = issueHref(slug);
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'View it';
  newStatus.replaceChildren('Published. ', link);

  newForm.reset();
  newDate.value = todayLocal();
  await refreshList();
});

/* ── Published issues ──────────────────────────────────────────────────── */

function labelled(text: string, id: string, type: string, value: string, max?: number): HTMLElement {
  const wrap = el('div', 'field');
  const label = el('label', undefined, text);
  label.htmlFor = id;
  const input = el('input');
  input.id = id;
  input.type = type;
  input.value = value;
  input.required = true;
  if (max !== undefined) input.maxLength = max;
  wrap.append(label, input);
  return wrap;
}

function issueRow(issue: NewsletterSummary): HTMLLIElement {
  const row = el('li', 'team-issue');
  const rowStatus = el('p', 'form-status');
  rowStatus.setAttribute('role', 'status');
  rowStatus.setAttribute('aria-live', 'polite');

  const details = el('div', 'team-issue-details');
  details.append(
    el('p', 'team-issue-title', issue.title),
    el('p', 'team-issue-date', formatDate(new Date(issue.issue_date)))
  );

  const view = el('a', 'btn btn-ghost btn-sm', 'View');
  view.href = issueHref(issue.slug);
  view.target = '_blank';
  view.rel = 'noopener';

  const editButton = el('button', 'btn btn-ghost btn-sm', 'Edit');
  editButton.type = 'button';
  const replaceButton = el('button', 'btn btn-ghost btn-sm', 'Replace');
  replaceButton.type = 'button';
  const deleteButton = el('button', 'btn btn-ghost btn-sm', 'Delete');
  deleteButton.type = 'button';

  const actions = el('div', 'team-issue-actions');
  actions.append(view, editButton, replaceButton, deleteButton);

  const head = el('div', 'team-issue-head');
  head.append(details, actions);

  // Editing changes the title and date only. The address keeps the title and
  // date it was published with, so links people saved still work.
  const editForm = el('form', 'team-issue-edit');
  editForm.hidden = true;
  editForm.noValidate = true;
  const titleField = labelled('Title', `edit-title-${issue.id}`, 'text', issue.title, 120);
  const dateField = labelled('Issue date', `edit-date-${issue.id}`, 'date', issue.issue_date);
  const titleInput = titleField.querySelector('input') as HTMLInputElement;
  const dateInput = dateField.querySelector('input') as HTMLInputElement;
  const saveButton = el('button', 'btn btn-primary btn-sm', 'Save');
  saveButton.type = 'submit';
  const cancelButton = el('button', 'btn btn-ghost btn-sm', 'Cancel');
  cancelButton.type = 'button';
  const editActions = el('div', 'team-issue-edit-actions');
  editActions.append(saveButton, cancelButton);
  editForm.append(titleField, dateField, editActions);

  // The replacement preview lives in the row, so a replaced file is checked
  // where it will go, next to the issue it replaces.
  const replacePanel = el('div', 'team-preview team-replace');
  replacePanel.hidden = true;
  const replaceWarnings = el('ul', 'team-warnings');
  replaceWarnings.hidden = true;
  const replaceArticle = el('div', 'nl-preview');
  const replaceActions = el('div', 'team-preview-actions');
  const replaceConfirm = el('button', 'btn btn-primary btn-sm', 'Replace issue');
  replaceConfirm.type = 'button';
  const replaceCancel = el('button', 'btn btn-ghost btn-sm', 'Cancel');
  replaceCancel.type = 'button';
  replaceActions.append(replaceConfirm, replaceCancel);
  const replaceStatus = el('p', 'form-status');
  replaceStatus.setAttribute('role', 'status');
  replaceStatus.setAttribute('aria-live', 'polite');
  replacePanel.append(replaceWarnings, replaceArticle, replaceActions, replaceStatus);

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileInput.hidden = true;

  row.append(head, editForm, replacePanel, fileInput, rowStatus);

  let replacement: Preview | null = null;

  // Every button in the row is switched off while one action is running, so
  // two writes to the same issue cannot overlap.
  function rowBusy(busy: boolean): void {
    row.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  }

  function clearReplacement(): void {
    releasePreview(replacement);
    replacement = null;
    replacePanel.hidden = true;
    replaceArticle.replaceChildren();
    setStatus(replaceStatus, '');
  }

  editButton.addEventListener('click', () => {
    clearReplacement();
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

  replaceButton.addEventListener('click', () => {
    editForm.hidden = true;
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    clearReplacement();
    setStatus(rowStatus, '');
    const problem = await checkDocx(file);
    if (problem) {
      setStatus(rowStatus, problem, true);
      return;
    }

    rowBusy(true);
    setStatus(rowStatus, 'Reading the file…');
    try {
      replacement = makePreview(await convertFile(file));
      showWarnings(replaceWarnings, replacement.result.warnings);
      replaceArticle.replaceChildren(
        renderIssue(replacement.result.html, { previewImages: replacement.urls })
      );
      replacePanel.hidden = false;
      setStatus(rowStatus, '');
      replacePanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (err) {
      setStatus(rowStatus, err instanceof Error ? err.message : "Couldn't read this Word file.", true);
    } finally {
      rowBusy(false);
    }
  });

  replaceCancel.addEventListener('click', clearReplacement);

  replaceConfirm.addEventListener('click', async () => {
    const next = replacement;
    if (!next) return;

    rowBusy(true);
    replaceConfirm.disabled = true;
    setStatus(replaceStatus, 'Replacing…');

    const fail = async (message: string, paths: string[] = []) => {
      await removePhotos(paths);
      rowBusy(false);
      setStatus(replaceStatus, message, true);
    };

    // The old issue is read first, because its photos are the ones to remove
    // once the new version is in place.
    let current: Newsletter | null;
    try {
      current = await getNewsletter(issue.slug);
    } catch (err) {
      console.error('Could not read the issue before replacing it:', err);
      await fail("Couldn't read this issue. Refresh the list and try again.");
      return;
    }
    if (!current) {
      await fail('This issue no longer exists. Refresh the list.');
      return;
    }

    const version = makeVersion();
    const upload = await uploadPhotos(issue.slug, version, next.result.images, (started) => {
      setStatus(replaceStatus, `Replacing… photo ${started} of ${next.result.images.length}`);
    });
    if (!upload.ok) {
      await fail(upload.message);
      return;
    }

    const updated = await supabase()
      .from('newsletters')
      .update({
        body_html: withPhotoAddresses(next.result.html, upload.urls),
        summary: next.result.summary,
        cover_url: upload.urls[0] ?? null,
      })
      .eq('id', issue.id)
      .select('id');

    if (updated.error || !updated.data || updated.data.length === 0) {
      const landed = await rowHasVersion(issue.slug, version);
      if (landed === null) {
        rowBusy(false);
        replaceConfirm.disabled = true;
        setStatus(
          replaceStatus,
          "Couldn't confirm the change, so the new photos were kept. Refresh the list before trying again.",
          true
        );
        return;
      }
      if (landed === false) {
        await fail(
          describeError(updated.error, "Couldn't save the new version. The old one is still in use."),
          upload.paths
        );
        return;
      }
      // The new version is in place after all, so the steps below still run.
    }

    // The row points at the new photos now, so the old ones are no longer used.
    // A failed cleanup only leaves unused files behind, so it is not an error for the team.
    const oldPhotos = await removePhotos(photoPathsIn(current.body_html));
    if (oldPhotos) console.warn('Could not remove the old photos:', oldPhotos);

    releasePreview(next);
    replacement = null;
    await refreshList();
    setStatus(listStatus, 'Replaced.');
  });

  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Delete "${issue.title}"? Its photos are deleted too, and the public page stops showing it.`)) {
      return;
    }
    rowBusy(true);
    setStatus(rowStatus, 'Deleting…');

    // The photos are listed from the stored HTML before the row goes, because
    // the row is what holds that list.
    let current: Newsletter | null;
    try {
      current = await getNewsletter(issue.slug);
    } catch (err) {
      console.error('Could not read the issue before deleting it:', err);
      rowBusy(false);
      setStatus(rowStatus, "Couldn't delete the issue. Try again.", true);
      return;
    }

    // Row first, photos second. If the row cannot be deleted, the photos stay,
    // so the issue is never left pointing at photos that are gone.
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

    const removed = await removePhotos(current ? photoPathsIn(current.body_html) : []);
    await refreshList();
    if (removed) {
      setStatus(
        listStatus,
        'The issue was deleted, but its photos could not be removed from storage.',
        true
      );
    }
  });

  return row;
}

/* ── Start ─────────────────────────────────────────────────────────────── */

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
  clearNewPreview();
  const { error } = await supabase().auth.signOut();
  setBusy(signoutButton, false);
  issuesList.replaceChildren();
  manager.hidden = true;
  showSignIn(
    error ? describeError(error, "Couldn't sign out. Try again.") : '',
    Boolean(error)
  );
});

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
