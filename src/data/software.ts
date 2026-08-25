/*
 * Software the team has built.
 *
 * Judges ask what students actually made, and "we wrote a scouting app" is a
 * much weaker answer than a page that says what it does and why it is built
 * that way. This is the equivalent of the tools section other teams run on
 * their technical binders.
 *
 * Only list things that exist. An idea with a nice card is still an idea, and
 * a judge who asks to see it and finds nothing has learned something worse
 * than if it had never been listed. Use `status: 'planned'` if you want to
 * show intent, and be honest in the copy about it.
 */

export type AppStatus = 'live' | 'in-progress' | 'planned';

export type SoftwareEntry = {
  name: string;
  tagline: string;
  status: AppStatus;
  /** Season or period it was built in. */
  period: string;
  /** Live URL, if it is deployed somewhere. */
  url?: string;
  /** Public source, if the team open-sources it. */
  repo?: string;
  /** Path to this app's guide under /docs/, if one is written. */
  docs?: string;
  /** The problem it solves, in plain terms. Two or three sentences. */
  problem: string;
  /** Notable engineering decisions. These are what judges actually probe. */
  highlights: { title: string; body: string }[];
  stack: string[];
};

export const software: SoftwareEntry[] = [
  {
    name: 'Bubblotics Scouting',
    tagline: 'Offline-first match scouting, analytics, and alliance picklist.',
    status: 'in-progress',
    period: '2025-26 season',
    // Served from this same site at /scout/. See
    // scripts/sync-scouting-app.sh for how the build gets here.
    url: '/scout/',
    // [PLACEHOLDER] Add once the source is public.
    // repo: 'https://github.com/kyleli73/bubblotics-scouting',
    problem:
      'Scouting data is only worth anything if it is complete and trustworthy, and both fail in the same place: a noisy venue with no usable wifi. Scouts miss matches, entries get lost on a dropped connection, and by alliance selection nobody knows which numbers to believe. This app is built so neither happens.',
    highlights: [
      {
        title: 'The form never touches the network',
        body: 'Entries are written straight to the phone’s own database, and a separate background module is the only code that ever uploads. A scout can work through an entire day fully offline and lose nothing.',
      },
      {
        title: 'Retrying cannot create duplicates',
        body: 'Every entry carries an ID generated on the phone, and uploads are an upsert against it. A sync interrupted halfway and retried updates the existing row instead of adding a second copy, which is the usual way offline apps quietly corrupt their own data.',
      },
      {
        title: 'Scout accuracy is measured, not assumed',
        body: 'Per-robot autonomous estimates are compared against the posted alliance scores to flag scouts whose numbers drift. Because alliance-scoped actions are excluded, every scout reads low by the same amount, so the comparison is against the median rather than against zero.',
      },
      {
        title: 'Coverage gaps surface before they matter',
        body: 'The manager view generates the scout rotation and then shows which matches and robots have no data, while there is still time to fix it rather than after the event.',
      },
      {
        title: 'Next season is a one-line change',
        body: 'Game-specific fields live in a single swappable module and answers are stored as a JSON blob, so moving from DECODE to next year’s game needs no database migration. The form, exports and analytics all follow automatically.',
      },
    ],
    stack: ['React', 'TypeScript', 'Vite', 'IndexedDB / Dexie', 'Supabase', 'FTCScout API'],
    docs: '/docs/scouting/',
  },
  {
    name: 'Bubblotics Inventory',
    tagline: 'What is in stock, what is on order, and what is on the robot.',
    status: 'in-progress',
    period: '2026',
    // [PLACEHOLDER] Add once inventory.bubblotics.ca is serving.
    // url: 'https://inventory.bubblotics.ca',
    docs: '/docs/inventory/',
    problem:
      'Build season loses hours to a part nobody can find, and days to a part nobody ordered. Tracking stock, orders and what is currently bolted to the robot in one place is the cheapest fix available to a team our size.',
    highlights: [
      {
        title: '[PLACEHOLDER] Written by whoever built it',
        body: 'Replace these with the real decisions behind the app. What it stores, how it is kept up to date, and what it does about the part someone takes off the shelf without telling anyone.',
      },
    ],
    stack: ['[PLACEHOLDER]'],
  },
];

/*
 * Ideas the team has scoped but not built. Shown separately and labelled as
 * such, so the page never implies more than exists.
 *
 * [PLACEHOLDER] Prune this to whatever you actually intend to build. Three
 * finished tools beat ten listed ones.
 */
export const softwareIdeas: { name: string; body: string }[] = [
  {
    name: 'Battery and current dashboard',
    body: 'Log pack voltage and per-motor current every match, then correlate voltage sag against autonomous success. Sag is a common and under-diagnosed cause of an auto that works in the pits and misses on the field.',
  },
  {
    name: 'Launcher trajectory calculator',
    body: 'Given goal distance and height, solve for flywheel speed and release angle, and check the result against measured shots.',
  },
  {
    name: 'Parts inventory',
    body: 'Track what is in stock, what is on order, and what is on the robot, so build season stops losing hours to hunting for a part that was never ordered.',
  },
];
