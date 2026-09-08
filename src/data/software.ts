/*
 * Software the team has built.
 *
 * ── Keep this a roster, not a manual, and not a download page ─────────────
 * Each app gets its name and one or two sentences saying what it is for.
 * That is the whole format. This section answers "what have you built?" for
 * a judge or another team skimming the site in thirty seconds.
 *
 * Two things it deliberately does NOT do:
 *
 *   1. No instructions. An earlier version carried a full sign-in-and-tap-
 *      through guide for the scouting app, which buried the only thing a
 *      visitor came for. Operating instructions belong with the app itself,
 *      behind its login, where the people who need them already are.
 *
 *   2. No links to the apps. These are internal team tools. A public link
 *      invites strangers into software that holds our competition data and
 *      our alliance picklist, which is exactly the thing we would not hand
 *      another team at an event. The site describes them; it is not the way
 *      in. If you are on the team, you already have the URL.
 *
 * Only list things that exist. An idea with a nice card is still an idea, and
 * a judge who asks to see it and finds nothing has learned something worse
 * than if it had never been listed. Use `softwareIdeas` below for intent.
 */

export type AppStatus = 'live' | 'in-progress' | 'planned';

export type SoftwareEntry = {
  name: string;
  /** What it is for, in a sentence or two. No instructions. */
  purpose: string;
  status: AppStatus;
  /** A few words on what it is written with. Optional. */
  stack?: string[];

  /*
   * [PLACEHOLDER] Screenshot, once someone grabs one.
   *
   * Put the file in src/assets/software/ and reference it relatively, e.g.
   * '../assets/software/scouting.png'. A screenshot is the single best
   * evidence that an app is real, and right now these cards are text only.
   * Take them on a phone for the scouting app, since that is where it runs.
   */
  // screenshot?: string;
  // screenshotAlt?: string;
};

export const software: SoftwareEntry[] = [
  {
    name: 'Bubblotics Scouting',
    purpose:
      'Records what every robot does in every match, works with no signal in the stands, and turns the results into the ranking we use to pick an alliance. It also checks its own data, flagging matches nobody covered and scouts whose numbers drift from everyone else.',
    status: 'in-progress',
    stack: ['React', 'TypeScript', 'IndexedDB', 'Supabase'],
  },
  {
    name: 'Bubblotics Inventory',
    purpose:
      'A single record of what parts are in stock, what is on order, and what is currently bolted to the robot, so build season stops losing hours to hunting for something that was never ordered.',
    status: 'in-progress',
    stack: ['[PLACEHOLDER]'],
  },
];

/*
 * Ideas the team has scoped but not built. Same format, shown separately and
 * labelled as such, so the page never implies more than exists.
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

/*
 * ── The three workstreams shown on the home page ──────────────────────────
 *
 * The home page summarises the software effort as three strands rather than
 * listing the app roster twice. `software` above is the roster; this is the
 * story. Only the first strand has anything running today, and the statuses
 * below say so.
 *
 * Keep the wording exact. "Planned" means no code exists. Writing "in
 * progress" against an empty folder is the specific lie that a judge catches
 * by asking one follow-up question.
 */
export const homeSoftware: {
  name: string;
  purpose: string;
  status: AppStatus;
}[] = [
  {
    name: 'Scouting and picklist',
    purpose:
      'Records what every robot does in every match, works with no signal in the stands, and turns the results into the ranking we use to pick an alliance.',
    status: 'in-progress',
  },
  {
    name: 'Odometry and autonomous',
    purpose:
      'Dead-reckoning from wheel encoders so the robot knows where it is on the field, and the autonomous routines that depend on it. Nothing written yet: this waits on a drivetrain we have not built.',
    status: 'planned',
  },
  {
    name: 'Vision',
    purpose:
      'Camera-based targeting for the BIOBUZZ game elements, once the game is released and we know what there is to aim at.',
    status: 'planned',
  },
];

/*
 * The columns our scouting app produces for alliance selection.
 *
 * This is the SHAPE of the picklist, not a picklist. There is no event data
 * because we have not been to an event. Anyone tempted to paste example rows
 * in here to make the table look fuller: don't. A table of invented team
 * numbers on a public site is indistinguishable from a claim, and it is the
 * fastest way to make every other number on this site suspect.
 */
export const picklistColumns: { field: string; source: string; use: string }[] =
  [
    {
      field: 'Team',
      source: 'Event schedule',
      use: 'Who the row is about',
    },
    {
      field: 'OPR',
      source: 'FTCScout API',
      use: 'Offensive power rating, pulled not observed',
    },
    {
      field: 'Auto avg',
      source: 'Our scouts',
      use: 'Mean autonomous points across matches we watched',
    },
    {
      field: 'Teleop avg',
      source: 'Our scouts',
      use: 'Mean driver-period points',
    },
    {
      field: 'Endgame',
      source: 'Our scouts',
      use: 'What they reliably manage in the last thirty seconds',
    },
    {
      field: 'Coverage',
      source: 'Derived',
      use: 'How many of their matches we actually have data for',
    },
    {
      field: 'Tier',
      source: 'Strategy call',
      use: 'First pick, second pick, or avoid',
    },
  ];
