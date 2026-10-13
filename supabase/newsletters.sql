-- ════════════════════════════════════════════════════════════════════════
--  NEWSLETTERS: storage and access rules for bubblotics.ca/newsletter
-- ════════════════════════════════════════════════════════════════════════
--
-- Run this in the Supabase SQL editor (project hhxwvxzlykycnuzkjccn, the
-- same project the scouting app uses). Safe to run again: every statement
-- checks before it creates. Running it on the first version (October 2026,
-- when issues were PDFs) upgrades the table in place.
--
-- WHAT IT SETS UP
--   newsletters (table)    one row per issue: title, date, and the issue
--                          itself as HTML, converted in the browser from
--                          the team's Word download
--   newsletters (bucket)   the photos inside the issues, public to read
--
-- WHO CAN DO WHAT
--   Anyone on the internet: read the issues and see the photos. That is
--   the point of a public newsletter.
--   The team's newsletter account, and nobody else: publish, replace,
--   edit, delete.
--
-- WHY THE CHECK IS ON ONE ACCOUNT, NOT "ANYONE SIGNED IN"
-- This Supabase project also runs the scouting app, and anyone can create
-- an account there (that is how new scouts join). So "is signed in" means
-- nothing here: a rule of `to authenticated` would let a stranger who made
-- a scouting account post to the public website. Every write below goes
-- through is_newsletter_editor(), which only says yes for one specific,
-- confirmed account.
--
-- The account is created by hand in the Supabase dashboard (Authentication
-- -> Users -> Add user, with "Auto Confirm User" ticked). Its password is
-- never written in this file or anywhere in the website's code.
--
-- If the newsletter email ever changes, change it in the function below AND
-- in NEWSLETTER_EMAIL in the website's src/lib/newsletter.ts.

-- ── Who may edit ────────────────────────────────────────────────────────
-- security definer: auth.users is not readable by ordinary signed-in users,
-- so the function runs with its owner's rights to look the caller up.
-- search_path = '' and fully qualified names stop anyone from shadowing a
-- table name with their own object.
-- email_confirmed_at: an unconfirmed sign-up with the same address does not
-- count, so registering the address without owning the inbox gets nowhere.
create or replace function public.is_newsletter_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = 'bubblotics+newsletter@gmail.com'
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_newsletter_editor() from public;
grant execute on function public.is_newsletter_editor() to anon, authenticated;

-- ── Upgrade guard ───────────────────────────────────────────────────────
-- The first version stored each issue as a PDF in a file_path column. That
-- column is dropped below. If any PDF issue still exists, stop here instead
-- of silently losing it: delete those issues at bubblotics.ca/team first.
-- The whole script runs as one transaction, so stopping changes nothing.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'newsletters'
      and column_name = 'file_path'
  ) and exists (select 1 from public.newsletters) then
    raise exception 'newsletters still holds PDF issues. Delete them at bubblotics.ca/team, then run this again.';
  end if;
end;
$$;

-- ── The issues ──────────────────────────────────────────────────────────
-- slug       the issue's address: bubblotics.ca/newsletter/issue/?n=<slug>.
--            Set once when the issue is published and never changed, so a
--            link a sponsor saved keeps working after a title edit.
-- body_html  the issue, already converted from Word to plain HTML. The
--            website sanitises it again every time it shows it, so this
--            column is never trusted on its own.
-- summary    the first paragraph as plain text, for the list page.
-- cover_url  the first photo, for the list page.
create table if not exists public.newsletters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  issue_date  date not null,
  slug        text not null,
  body_html   text not null,
  summary     text,
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Upgrading from the PDF version: add the new columns, drop the old one.
alter table public.newsletters drop column if exists file_path;
alter table public.newsletters add column if not exists slug text;
alter table public.newsletters add column if not exists body_html text;
alter table public.newsletters add column if not exists summary text;
alter table public.newsletters add column if not exists cover_url text;
alter table public.newsletters alter column slug set not null;
alter table public.newsletters alter column body_html set not null;

-- Named checks, dropped and re-added so a second run never stacks copies.
alter table public.newsletters drop constraint if exists newsletters_slug_format;
alter table public.newsletters add constraint newsletters_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100);

-- 500,000 characters is far more than any two-week issue needs (photos
-- live in storage, not in this column) and stops the table being used as
-- a dumping ground. A literal <script tag can only get here by someone
-- writing HTML by hand, since the converter never makes one.
alter table public.newsletters drop constraint if exists newsletters_body_check;
alter table public.newsletters add constraint newsletters_body_check
  check (char_length(body_html) between 1 and 500000 and body_html !~* '<\s*script');

alter table public.newsletters drop constraint if exists newsletters_summary_check;
alter table public.newsletters add constraint newsletters_summary_check
  check (summary is null or char_length(summary) <= 300);

-- The cover must be a photo in this project's own bucket, never an image
-- from somewhere else on the internet.
alter table public.newsletters drop constraint if exists newsletters_cover_check;
alter table public.newsletters add constraint newsletters_cover_check
  check (cover_url is null or starts_with(cover_url,
    'https://hhxwvxzlykycnuzkjccn.supabase.co/storage/v1/object/public/newsletters/'));

create unique index if not exists newsletters_slug_key
  on public.newsletters (slug);

create index if not exists newsletters_issue_date_idx
  on public.newsletters (issue_date desc);

-- Keep updated_at honest without trusting the browser to set it.
create or replace function public.newsletters_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists newsletters_touch on public.newsletters;
create trigger newsletters_touch
  before update on public.newsletters
  for each row execute function public.newsletters_touch();

alter table public.newsletters enable row level security;

drop policy if exists "newsletters: anyone can read" on public.newsletters;
create policy "newsletters: anyone can read"
  on public.newsletters for select
  to anon, authenticated
  using (true);

drop policy if exists "newsletters: editor can add" on public.newsletters;
create policy "newsletters: editor can add"
  on public.newsletters for insert
  to authenticated
  with check (public.is_newsletter_editor());

drop policy if exists "newsletters: editor can change" on public.newsletters;
create policy "newsletters: editor can change"
  on public.newsletters for update
  to authenticated
  using (public.is_newsletter_editor())
  with check (public.is_newsletter_editor());

drop policy if exists "newsletters: editor can delete" on public.newsletters;
create policy "newsletters: editor can delete"
  on public.newsletters for delete
  to authenticated
  using (public.is_newsletter_editor());

-- ── The photos ──────────────────────────────────────────────────────────
-- public = true: files are readable at their public URL with no policy,
-- which is what the issue pages link to. Writing still needs the policies
-- below. The bucket itself refuses anything that is not an image or is
-- over 10 MB, whatever the browser claims. The website shrinks each photo
-- before uploading, so a real one is well under that.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletters', 'newsletters', true, 10485760,
        array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Photo paths are <slug>/<version>/<n>.<ext>, for example
-- 2026-10-24-first-issue/k3x9qa/1.webp. Each upload of an issue gets a new
-- version folder, because Supabase's CDN caches public files and readers
-- would otherwise keep seeing the old photo after a replace.
-- The first version's policies were named "newsletter pdfs: ...".
drop policy if exists "newsletter pdfs: editor can upload" on storage.objects;
drop policy if exists "newsletter pdfs: editor can see" on storage.objects;
drop policy if exists "newsletter pdfs: editor can replace" on storage.objects;
drop policy if exists "newsletter pdfs: editor can delete" on storage.objects;

drop policy if exists "newsletter photos: editor can upload" on storage.objects;
create policy "newsletter photos: editor can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'newsletters'
    and public.is_newsletter_editor()
    and name ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]{6}/[0-9]{1,3}\.(webp|jpg|png|gif)$'
  );

-- Listing and removing files needs select as well as delete.
drop policy if exists "newsletter photos: editor can see" on storage.objects;
create policy "newsletter photos: editor can see"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'newsletters' and public.is_newsletter_editor());

drop policy if exists "newsletter photos: editor can delete" on storage.objects;
create policy "newsletter photos: editor can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'newsletters' and public.is_newsletter_editor());
