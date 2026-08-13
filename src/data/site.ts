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

  // One sentence, used in page metadata and link previews.
  metaDescription:
    'Bubblotics is FIRST Tech Challenge Team 35858, a rookie student robotics team in Aurora, Ontario, part of SolversMind Robotics. First season: BIOBUZZ 2026-27.',

  /*
   * Home page "who we are" block. Written for a team whose first season has
   * not started, so it talks about what is being built rather than about
   * results that do not exist yet.
   */
  blurb:
    'We are a rookie FIRST Tech Challenge team of fifteen students in Aurora, Ontario, part of SolversMind Robotics. BIOBUZZ will be our first competition season. We are spending the run-up building the things a team needs before its first match: an offseason robot to learn on, our own scouting software, and four subteams that each know what they are responsible for. Between now and then we mentor five FIRST LEGO League teams, which is where several of us started.',
};

/*
 * Home page stat counters. These animate from zero when scrolled into view.
 *
 * `value` must be a plain number for the counter to work. Put any symbol in
 * `suffix` ("+", "%") and any wording in `label`.
 */
export const stats = [
  /*
   * Only things that are true today. A rookie team's honest figures are
   * seasons: 0, awards: 0, championships: 0, and three counters animating
   * up to zero is a worse look than not having them. These are the numbers
   * that are actually non-zero and actually mean something.
   */
  { value: 15, suffix: '', label: 'Students on the team' },
  { value: 5, suffix: '', label: 'FLL teams we mentor' },
  { value: 4, suffix: '', label: 'Subteams' },
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
    // [PLACEHOLDER] Confirm each description.
    description:
      'Designs the robot in Onshape, then machines, prints, and assembles it. Owns drivetrain, intake, scoring mechanisms, and every iteration in between.',
  },
  {
    name: 'Programming',
    description:
      'Writes the autonomous routines and driver controls, tunes odometry and vision, and maintains the tooling the team relies on during matches.',
  },
  {
    name: 'Business and Outreach',
    description:
      'Runs sponsorship, the engineering portfolio, and the community events that put robotics in front of students who have not seen it before.',
  },
  {
    name: 'Strategy and Scouting',
    description:
      'Tracks every match at every event, turns it into data the drive team can use, and builds the alliance selection picklist.',
  },
];

/*
 * Outreach events. Newest first.
 */
export const outreach = [
  /*
   * Mentoring is the real outreach story right now. Several members came up
   * through FLL themselves, which is worth saying: judges consistently rate
   * "we went back and taught the programme we came from" above a one-off
   * demo day.
   */
  {
    title: 'Mentoring five FIRST LEGO League teams',
    date: 'Ongoing, 2025-26 season',
    audience: 'Five FLL teams across Aurora, Newmarket, Richmond Hill and Markham',
    description:
      'We mentor the five FIRST LEGO League teams run by SolversMind Robotics, helping younger students with robot design, programming and the presentations judges ask them for. Several of us competed in FLL ourselves, which is where we learned most of what we bring to this team.',
    image: null as string | null,
  },
  {
    // [PLACEHOLDER] Kyle: fill in the other four team numbers and names.
    // Only 52777 Solvers of X&Y is confirmed, so it is the only one named.
    title: '[PLACEHOLDER] The teams we mentor',
    date: '2025-26 season',
    audience: 'FLL Team 52777 "Solvers of X&Y", plus four more',
    description:
      '[PLACEHOLDER] Add the numbers and names of the other four FLL teams, and one line each on what you help them with. Team 52777 Solvers of X&Y placed first in Ontario and took the Robot Design Finalist Award at the World Championship in Houston.',
    image: null as string | null,
  },
  {
    // [PLACEHOLDER] Delete this entry if there is nothing to put in it yet.
    title: '[PLACEHOLDER: A demo or school visit]',
    date: '[PLACEHOLDER: Month 2026]',
    audience: '[PLACEHOLDER: Who was there, and roughly how many]',
    description:
      '[PLACEHOLDER] Once the team runs its own outreach event, describe it here: what you did, who it reached, and what came of it.',
    image: null as string | null,
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
      'Provides our workspace, tools and mentorship',
      'Runs the FLL programme most of our members came up through',
      'Named on every page of this site',
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
      'Logo on the robot and on team apparel',
      'Named in our engineering portfolio and at every event we attend',
      'Logo on this website',
    ],
    members: [],
  },
  {
    name: 'Community supporter',
    contribution: 'Any amount, or an in-kind donation of parts or machining',
    benefits: ['Named on this website', 'Thanked in our season recap'],
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
 * The header and footer navigation. Add a page here and it appears in both,
 * plus the mobile menu and the footer sitemap.
 */
export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Our Story', href: '/about/' },
  { label: 'Robots', href: '/robots/' },
  { label: 'Software', href: '/software/' },
  { label: 'Awards', href: '/awards/' },
  { label: 'Gallery', href: '/gallery/' },
  { label: 'Updates', href: '/updates/' },
  { label: 'Outreach', href: '/outreach/' },
  { label: 'Sponsors', href: '/sponsors/' },
  { label: 'Contact', href: '/contact/' },
];
