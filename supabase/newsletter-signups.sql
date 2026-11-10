-- ════════════════════════════════════════════════════════════════════════
--  NEWSLETTER EMAIL SIGN-UPS: the consent record behind the monthly email
-- ════════════════════════════════════════════════════════════════════════
--
-- Run this once in the Supabase SQL editor (project hhxwvxzlykycnuzkjccn).
-- Safe to run again.
--
-- HOW SIGNING UP WORKS
--   1. Someone types their email on bubblotics.ca/newsletter.
--   2. The newsletter-signup Edge Function (supabase/functions/newsletter-signup)
--      saves a row here with a one-time token and emails them a confirm link.
--   3. They click it. The function marks the row confirmed and adds them to
--      the "Newsletter" segment in Resend, which sends the monthly email.
--
-- WHY A TABLE AT ALL, WHEN RESEND HOLDS THE LIST
-- Canada's anti-spam law (CASL) expects the sender to be able to show when
-- and how each person agreed to get email. This table is that record. It
-- also lets the function refuse floods of sign-ups, which would otherwise
-- burn the free plan's 100 emails a day on confirm links nobody asked for.
--
-- WHO CAN READ IT
-- Nobody through the public API. RLS is on with no policies, so the anon
-- and signed-in roles see nothing, even scouting-app managers. Only the Edge
-- Function, which runs with the service role on Supabase's servers, can read
-- or write it. Email addresses are personal data; keep it that way.
--
-- Unsubscribing happens in Resend (the link in every email). Rows here stay
-- as the record of consent and are not deleted when someone leaves.

create table if not exists public.newsletter_signups (
  id            uuid primary key default gen_random_uuid(),
  -- Stored lowercase and trimmed by the function, checked again here.
  email         text not null
                check (char_length(email) between 3 and 254 and email = lower(btrim(email))),
  -- SHA-256 of the token in the confirm link, as hex. The token itself is
  -- never stored, so a leaked table can't be used to confirm anyone.
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days',
  confirmed_at  timestamptz,
  source        text not null default 'bubblotics.ca/newsletter'
);

create index if not exists newsletter_signups_email_idx
  on public.newsletter_signups (email, created_at desc);

create index if not exists newsletter_signups_created_idx
  on public.newsletter_signups (created_at desc);

alter table public.newsletter_signups enable row level security;

-- From 2026-10-30 Supabase no longer grants new public tables to the API
-- roles automatically, and a missing grant shows up as "permission denied".
-- Only the service role (the Edge Function) gets access, and explicitly.
revoke all on table public.newsletter_signups from anon, authenticated;
-- delete: if the confirm email fails to send, the function removes the row
-- it just added, so a failed attempt never counts against the rate limits.
grant select, insert, update, delete on table public.newsletter_signups to service_role;
