/*
 * Software the team has built.
 *
 * ── Keep this a roster, not a manual ──────────────────────────────────────
 * The format here is deliberate: each app gets its name, one sentence saying
 * what it is for, and a link. That is it. This page answers "what have you
 * built?" for a judge or another team skimming in thirty seconds.
 *
 * It is NOT the place for instructions. An earlier version of this section
 * carried a full sign-in-and-tap-through guide for the scouting app and it
 * buried the only thing a visitor came for, which is the list. Operating
 * instructions belong with the app itself, behind its own login, where the
 * people who need them already are.
 *
 * Only list things that exist. An idea with a nice card is still an idea, and
 * a judge who asks to see it and finds nothing has learned something worse
 * than if it had never been listed. Use `softwareIdeas` below for intent.
 */

export type AppStatus = 'live' | 'in-progress' | 'planned';

export type SoftwareEntry = {
  name: string;
  /** What it is for, in one sentence. Keep it to one sentence. */
  purpose: string;
  status: AppStatus;
  /** Live URL, if it is deployed somewhere. */
  url?: string;
  /** Public source, if the team open-sources it. */
  repo?: string;
  /** A few words on what it is written with. Optional. */
  stack?: string[];
};

export const software: SoftwareEntry[] = [
  {
    name: 'Bubblotics Scouting',
    purpose:
      'Offline-first match scouting that captures every robot at an event, checks the data for gaps and outliers, and builds the alliance selection picklist.',
    status: 'in-progress',
    // Served from this same site at /scout/. See
    // scripts/sync-scouting-app.sh for how the build gets here.
    url: '/scout/',
    // [PLACEHOLDER] Add once the source is public.
    // repo: 'https://github.com/kyleli73/bubblotics-scouting',
    stack: ['React', 'TypeScript', 'IndexedDB', 'Supabase'],
  },
  {
    name: 'Bubblotics Inventory',
    purpose:
      'A single record of what parts are in stock, what is on order, and what is currently bolted to the robot.',
    status: 'in-progress',
    // [PLACEHOLDER] Add once inventory.bubblotics.ca is serving.
    // url: 'https://inventory.bubblotics.ca',
    stack: ['[PLACEHOLDER]'],
  },
];

/*
 * Ideas the team has scoped but not built. Same one-line format, shown
 * separately and labelled as such, so the page never implies more than exists.
 *
 * [PLACEHOLDER] Prune this to whatever you actually intend to build. Two
 * finished tools beat ten listed ones.
 */
export const softwareIdeas: { name: string; purpose: string }[] = [
  {
    name: 'Battery Log',
    purpose:
      'Tracks pack voltage and per-motor current match by match, so a sagging battery gets caught before it costs an autonomous.',
  },
  {
    name: 'Launcher Solver',
    purpose:
      'Works out flywheel speed and release angle for a given goal distance, then checks the answer against shots we actually measured.',
  },
];
