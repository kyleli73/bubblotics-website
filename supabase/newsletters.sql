-- ════════════════════════════════════════════════════════════════════════
--  NEWSLETTERS: storage and access rules for bubblotics.ca/newsletter
-- ════════════════════════════════════════════════════════════════════════
--
-- Run this once in the Supabase SQL editor (project hhxwvxzlykycnuzkjccn,
-- the same project the scouting app uses). Safe to run again: every
-- statement checks before it creates.
--
-- WHAT IT SETS UP
--   newsletters (table)    one row per issue: title, date, which PDF
--   newsletters (bucket)   the PDFs themselves, public to read
--
-- WHO CAN DO WHAT
--   Anyone on the internet: read the list and open the PDFs. That is the
--   point of a public newsletter.
--   The team's newsletter account, and nobody else: upload, replace, edit,
--   delete.
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

-- ── The list of issues ──────────────────────────────────────────────────
create table if not exists public.newsletters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  issue_date  date not null,
  file_path   text not null unique check (file_path ~ '^[a-z0-9-]+\.pdf$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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

-- ── The PDFs ────────────────────────────────────────────────────────────
-- public = true: files are readable at their public URL with no policy,
-- which is what the newsletter page links to. Writing still needs the
-- policies below. The bucket itself refuses anything that is not a PDF or
-- is over 20 MB, whatever the browser claims.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletters', 'newsletters', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "newsletter pdfs: editor can upload" on storage.objects;
create policy "newsletter pdfs: editor can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'newsletters' and public.is_newsletter_editor());

-- Replacing a PDF (upload with upsert) needs select and update as well.
drop policy if exists "newsletter pdfs: editor can see" on storage.objects;
create policy "newsletter pdfs: editor can see"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'newsletters' and public.is_newsletter_editor());

drop policy if exists "newsletter pdfs: editor can replace" on storage.objects;
create policy "newsletter pdfs: editor can replace"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'newsletters' and public.is_newsletter_editor())
  with check (bucket_id = 'newsletters' and public.is_newsletter_editor());

drop policy if exists "newsletter pdfs: editor can delete" on storage.objects;
create policy "newsletter pdfs: editor can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'newsletters' and public.is_newsletter_editor());
