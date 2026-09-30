/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  EDIT THIS FILE FIRST.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Everything that isn't a blog post or a robot page lives here: team facts,
 * stats, awards, outreach events, sponsors, contact details. One file, so a
 * teammate updating the site after a competition doesn't have to hunt through
 * nine page templates to change a number.
 *
 * Anything marked [PLACEHOLDER] is invented and needs replacing with real
 * information. Search the project for "[PLACEHOLDER]" to find every one.
 */

export const team = {
  name: 'Bubblotics',
  number: '35858',

  // The branding guide says we are always "Bubblotics", "Team 35858",
  // "35858", or "Robotics Team 35858". Nothing else.
  formalName: 'Robotics Team 35858',

  program: 'FIRST Tech Challenge',

  location: 'Aurora, Ontario, Canada',

  /*
   * The team has not competed yet. BIOBUZZ (2026-27) will be the first
   * season. Everything on this site is written to say that plainly rather
   * than imply a history that does not exist: a judge or sponsor who finds
   * one invented claim stops believing the rest of the page.
   */
  rookieYear: '2026-27',
  rookieSeason: 'BIOBUZZ',
  hasCompeted: false,

  /** The organisation the team is part of. */
  parentOrg: 'SolversMind Robotics',
  parentOrgUrl: 'https://solversmind.ca/',

  tagline: 'Engineered to rise.',

  // Hero line used on home page below the tagline.
  heroLine: 'An FTC team based in Aurora, Ontario.',

  /*
   * Home page "who we are" block. Written for a team whose first season has
   * not started, so it talks about what is being built rather than about
   * results that do not exist yet.
   */
  blurb:
    'We are a rookie FIRST Tech Challenge team of fifteen students in Aurora, Ontario. BIOBUZZ is our first competition season. We mentor five FIRST LEGO League teams: Solvers of X & Y, Chrono Solvers, Future Solvers, Unknown Solvers and Solvers of Infinity.',
};

/*
 * The current season's robot. Used on the home page to show progress toward
 * the first event.
 */
export type CurrentRobot = {
  name: string;
  status: string;
};

export const currentRobot: CurrentRobot = {
  name: 'Bubblebee',
  status: 'CAD done',
};

/*
 * The first competition of the season. The date came from the team (it had
 * not been published by FIRST when this was written, and last season's
 * North York Qualifier was 2025-11-15). Always format it with formatDate()
 * from src/lib/paths.ts, which works in UTC: formatting a date-only value in
 * local time shows the day before in Ontario, which is how "November 8"
 * rendered as "November 7" once already.
 */
export type NextEvent = {
  name: string;
  date: Date;
  dateConfirmed: boolean;
  venue: string;
  city: string;
  lastYear?: {
    date: string;
    code: string;
    url: string;
  };
};

export const nextEvent: NextEvent = {
  name: 'North York Qualifier',
  date: new Date('2026-11-08'),
  dateConfirmed: true,
  venue: 'Brebeuf College School',
  city: 'North York, Ontario',
  lastYear: {
    date: '2025-11-15',
    code: 'CAONNYQ',
    url: 'https://ftcscout.org/events/2025/CAONNYQ',
  },
};

/*
 * Home page stat counters. These animate from zero when scrolled into view.
 *
 * `value` must be a plain number for the counter to work. Put any symbol in
 * `suffix` ("+", "%") and any wording in `label`.
 */
export type Stat = {
  value: number;
  suffix: string;
  label: string;
  /*
   * Set false for a figure that is an identifier rather than a quantity.
   * "2026" is a year: watching it tick up from zero reads as a counter
   * that has not finished loading, not as a fact. It renders immediately.
   */
  count?: boolean;
};

export const stats: Stat[] = [
  /*
   * Only things that are true today. A rookie team's honest figures are
   * seasons: 0, awards: 0, championships: 0, and counters animating up to
   * zero is a worse look than not having them. These are the numbers that
   * are actually non-zero and actually mean something.
   */
  { value: 15, suffix: '', label: 'Students on the team' },
  { value: 4, suffix: '', label: 'Subteams' },
  { value: 5, suffix: '', label: 'FLL teams mentored' },
  { value: 2026, suffix: '', label: 'First season', count: false },
];

/*
 * Awards and results, newest season first.
 *
 * `standout` draws the gold treatment. Use it for wins that genuinely matter
 * (Inspire, a championship advance, a division win) rather than everything,
 * or the emphasis stops meaning anything.
 */
export type AwardEntry = {
  award: string;
  detail?: string;
  standout?: boolean;
};

export type CompetitionEntry = {
  event: string;
  location: string;
  date: string;
  awards: AwardEntry[];
  // Optional record line, e.g. "7-3-0, ranked 4th of 36".
  record?: string;
};

export type SeasonEntry = {
  year: string;
  game: string;
  robot?: string;
  // Matches the `slug` of a file in src/content/robots/ so the season links
  // to its robot page. Leave undefined if that page doesn't exist yet.
  robotSlug?: string;
  competitions: CompetitionEntry[];
};

export const seasons: SeasonEntry[] = [
  /*
   * Empty on purpose. Bubblotics has not competed yet, so there is no
   * record to show. The Awards page reads this and renders a rookie state
   * rather than an empty table.
   *
   * After your first event, add an entry like this:
   *
   *   {
   *     year: '2026-27',
   *     game: 'BIOBUZZ',
   *     robot: 'Robot name',
   *     robotSlug: 'robot-name',
   *     competitions: [
   *       {
   *         event: 'Ontario qualifier name',
   *         location: 'City, ON',
   *         date: 'Month 2027',
   *         record: '7-3-0, ranked 4th of 36',
   *         awards: [{ award: 'Award name', detail: 'Why.', standout: true }],
   *       },
   *     ],
   *   },
   */
];


/*
 * Subteams for the About page. The split below is typical for an FTC team of
 * this size, but change it to match how Bubblotics actually divides work.
 */
export const subteams = [
  {
    name: 'Mechanical',
    description:
      'Mechanical does the CAD in Onshape, manufactures parts with CNC machining and 3D printing, and does the electronics and wiring on the robot.',
  },
  {
    name: 'Programming',
    description:
      'Programming programs auto and teleop, and makes any software or websites the team needs, like this one.',
  },
  {
    name: 'Business and Outreach',
    description:
      'They get sponsors, make the engineering portfolio, and plan outreach events.',
  },
  {
    name: 'Strategy and Scouting',
    description:
      'At events, our scouting subteam is basically everyone except the drive team, and they use our scouting app.',
  },
];

/*
 * Outreach events. Newest first.
 */
/*
 * Outreach.
 *
 * ── A point of care ────────────────────────────────────────────────────
 * The awards below belong to the FLL teams, not to Bubblotics. We mentor
 * them; they won them. The copy says so explicitly and the page groups them
 * under the teams' own names, because quietly absorbing someone else's
 * trophies into your own record is exactly the kind of thing that makes a
 * judge stop trusting a page.
 */
export const outreach = [
  {
    title: 'Mentoring five FIRST LEGO League teams',
    date: 'Ongoing, 2024-25 SUBMERGED and 2025-26 UNEARTHED seasons',
    audience: 'Five FLL teams across Aurora, Newmarket, Richmond Hill and Markham',
    description:
      'All of our team members have come from world-class FLL teams, like Solvers of X & Y.',
    image: null as string | null,
  },
];

/*
 * The FLL teams we mentor, and what they achieved across seasons.
 * Source: https://solversmind.ca/fllteams/2025-2026-season and
 * https://solversmind.ca/fllteams/2024-2025-season
 *
 * Awards are grouped by season, newest first (2025-26 UNEARTHED, then
 * 2024-25 SUBMERGED).
 */
export type FllTeam = {
  name: string;
  number?: string;
  awards: { season: string; award: string }[];
};

export const fllTeams: FllTeam[] = [
  {
    name: 'Solvers of X & Y',
    number: '52777',
    awards: [
      { season: '2025-26 UNEARTHED', award: "Champion's Award, 1st place (Regional)" },
      { season: '2025-26 UNEARTHED', award: "Champion's Award, 1st place (Provincial)" },
      { season: '2025-26 UNEARTHED', award: 'Robot Design Finalist Award (World Championship)' },
      { season: '2024-25 SUBMERGED', award: 'Innovation Project Finalist Award (FIRST Championship)' },
      { season: '2024-25 SUBMERGED', award: "Champion's Award, 1st place (Provincial)" },
      { season: '2024-25 SUBMERGED', award: 'Robot Performance Award, 2nd place (Provincial)' },
      { season: '2024-25 SUBMERGED', award: 'Innovation Project Award (Regional)' },
    ],
  },
  {
    name: 'Chrono Solvers',
    awards: [
      { season: '2025-26 UNEARTHED', award: 'Robot Performance Award, 1st place (Regional)' },
      { season: '2025-26 UNEARTHED', award: "Champion's Award, 2nd place (Regional)" },
      { season: '2025-26 UNEARTHED', award: 'Breakthrough Award, 2nd place (Canada Cup)' },
    ],
  },
  {
    name: 'Future Solvers',
    awards: [
      { season: '2025-26 UNEARTHED', award: 'Core Values Award, 1st place (Regional)' },
      { season: '2025-26 UNEARTHED', award: 'Alliance Challenge Award (Provincial)' },
    ],
  },
  {
    name: 'Unknown Solvers',
    number: '52736',
    awards: [
      { season: '2025-26 UNEARTHED', award: 'Robot Performance Award, 2nd place (Regional)' },
      { season: '2024-25 SUBMERGED', award: 'Robot Design Award, 1st place (Provincial)' },
      { season: '2024-25 SUBMERGED', award: "Champion's Award, 1st place (Regional)" },
      { season: '2024-25 SUBMERGED', award: 'Robot Performance Award, 1st place (Regional)' },
      { season: '2024-25 SUBMERGED', award: 'Coach Award (Regional)' },
    ],
  },
  {
    name: 'Solvers of Infinity',
    awards: [
      { season: '2025-26 UNEARTHED', award: 'Robot Design Award, 2nd place (Regional)' },
    ],
  },
];



/*
 * Sponsors, grouped by tier. An empty `members` array renders as a clearly
 * marked open slot rather than a broken-looking gap, which is the honest way
 * to launch before the first sponsor signs.
 */
export type Sponsor = {
  name: string;
  /** Path under public/, e.g. '/images/sponsors/acme.png'. */
  logo?: string;
  url?: string;
};

export type SponsorTier = {
  name: string;
  contribution: string;
  benefits: string[];
  members: Sponsor[];
};

export const sponsorTiers: SponsorTier[] = [
  {
    name: 'Founding partner',
    /*
     * No dollar figures anywhere yet, by the team's decision. An amount you
     * have to walk back later is worse than no amount, and a rookie team
     * does not have a season's real costs to quote from.
     */
    contribution: 'Our home organisation',
    benefits: [
      'Everything: our workspace, tools and mentorship',
    ],
    members: [
      {
        name: 'SolversMind Robotics',
        url: 'https://solversmind.ca/',
        // [PLACEHOLDER] Save their logo to public/images/sponsors/ and add:
        // logo: '/images/sponsors/solversmind.png',
      },
    ],
  },
  {
    name: 'Season sponsor',
    contribution: 'Open',
    benefits: [
      '[PLACEHOLDER] Benefits, waiting on the sponsorship package',
    ],
    members: [],
  },
  {
    name: 'Community supporter',
    contribution: 'Any amount, or an in-kind donation of parts or machining',
    benefits: ['[PLACEHOLDER] Benefits, waiting on the sponsorship package'],
    members: [],
  },
];


/*
 * Contact and social. Confirmed by the team:
 *   email     bubblotics@gmail.com
 *   Instagram @bubblotics
 *
 * A link with `handle: null` is skipped everywhere, so unclaimed accounts
 * don't render as dead links. Fill in the handle to switch one on.
 */
export const contact = {
  email: 'bubblotics@gmail.com',

  socials: [
    {
      name: 'Instagram',
      handle: '@bubblotics',
      url: 'https://instagram.com/bubblotics',
      icon: 'instagram' as const,
    },
    {
      name: 'YouTube',
      // [PLACEHOLDER] Fill in the handle and URL to enable this link.
      handle: null,
      url: 'https://youtube.com/@bubblotics',
      icon: 'youtube' as const,
    },
    {
      name: 'GitHub',
      // [PLACEHOLDER] Fill in the handle and URL to enable this link.
      handle: null,
      url: 'https://github.com/bubblotics',
      icon: 'github' as const,
    },
  ],
};

/* Only socials with a real handle. Used by the footer and contact page. */
export const activeSocials = contact.socials.filter((s) => s.handle !== null);

/*
 * ── Navigation ────────────────────────────────────────────────────────────
 *
 * Ten flat links is too many for a menu bar. Past about seven, nobody reads
 * the row, they scan it, and scanning ten similar words takes longer than
 * reading four. So the header groups them under four headings and opens each
 * as a dropdown.
 *
 * The grouping is by what a visitor came for, not by our internal structure:
 *
 *   Team      who we are and how to reach us
 *   Build     the things we make, hardware and software
 *   Season    what has happened and what we are posting about
 *   Sponsors  the ask, and who has already said yes
 *
 * `nav` below is kept as a flat list, derived from the groups, because the
 * footer sitemap and the mobile panel both want every link at one level. Add
 * a page to a group and it appears in all three places.
 */
export type NavGroup = {
  label: string;
  /** Where the group heading itself points, if it has a page of its own. */
  href?: string;
  items: { label: string; href: string; blurb: string }[];
};

export const navGroups: NavGroup[] = [
  {
    label: 'Team',
    items: [
      {
        label: 'Our Story',
        href: '/about/',
        blurb: 'Who we are and how the team started',
      },
      {
        label: 'Outreach',
        href: '/outreach/',
        blurb: 'The five FLL teams we mentor',
      },
      {
        label: 'Contact',
        href: '/contact/',
        blurb: 'Email, Instagram, and where to find us',
      },
    ],
  },
  {
    label: 'Build',
    items: [
      {
        label: 'Robots',
        href: '/robots/',
        blurb: 'What we have built, season by season',
      },
    ],
  },
  {
    label: 'Season',
    items: [
      {
        label: 'Updates',
        href: '/updates/',
        blurb: 'Notes from the workshop',
      },
      {
        label: 'Awards',
        href: '/awards/',
        blurb: 'Results, once we have them',
      },
      {
        label: 'Gallery',
        href: '/gallery/',
        blurb: 'Photos from builds and events',
      },
    ],
  },
  {
    label: 'Sponsors',
    href: '/sponsors/',
    items: [
      {
        label: 'Our Sponsors',
        href: '/sponsors/',
        blurb: 'The people backing this team',
      },
      {
        label: 'Sponsor Us',
        href: '/sponsors/#tiers',
        blurb: 'What your support pays for',
      },
    ],
  },
];

/*
 * Flat list, derived. The footer sitemap and the mobile menu use this.
 *
 * Home is prepended by hand because it has no group: it is the logo.
 * Duplicate hrefs are dropped so "Sponsor Us" (an anchor on the sponsors
 * page) does not show up twice in the footer.
 */
export const nav: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  ...navGroups
    .flatMap((g) => g.items)
    .map(({ label, href }) => ({ label, href }))
    // Drop anything whose href we already have. Two entries pointing at the
    // same page in one footer column looks like a mistake, because it is.
    .filter(
      (item, i, all) => all.findIndex((x) => x.href === item.href) === i
    )
    .filter((item) => !item.href.includes('#')),
];
