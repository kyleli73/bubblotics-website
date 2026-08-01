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

  // [PLACEHOLDER] Add the city. The province is right if you compete at
  // Ontario provincials, but confirm it.
  location: '[PLACEHOLDER: City], Ontario, Canada',

  // [PLACEHOLDER] The year the team first competed.
  rookieYear: '[PLACEHOLDER: 20XX]',

  tagline: 'Engineered to rise.',

  // One sentence, used in page metadata and link previews.
  metaDescription:
    'Bubblotics is FIRST Tech Challenge Team 35858, a student robotics team building competition robots and running STEM outreach in Ontario.',

  // Two to four sentences for the home page "who we are" block.
  // [PLACEHOLDER] Rewrite in the team's own words.
  blurb:
    'We are a student-run FIRST Tech Challenge team designing, building, and programming a new competition robot every season. Our work runs from CAD and machining through autonomous software and scouting analytics, and it carries into the classrooms and community events where we introduce younger students to engineering. Every season we set out to build something that holds up under pressure and to bring more people with us while we do it.',
};

/*
 * Home page stat counters. These animate from zero when scrolled into view.
 *
 * `value` must be a plain number for the counter to work. Put any symbol in
 * `suffix` ("+", "%") and any wording in `label`.
 */
export const stats = [
  // [PLACEHOLDER] Replace all four with real figures.
  { value: 4, suffix: '', label: 'Seasons competed' },
  { value: 12, suffix: '', label: 'Awards won' },
  { value: 45, suffix: '+', label: 'Members and alumni' },
  { value: 2, suffix: '', label: 'Championship appearances' },
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
  // [PLACEHOLDER] This entire array is invented. Replace it with the team's
  // real competition history. Delete any season that doesn't apply.
  {
    year: '2025-26',
    game: 'DECODE',
    robot: '[PLACEHOLDER: Robot name]',
    robotSlug: 'decode-robot',
    competitions: [
      {
        event: '[PLACEHOLDER: Qualifier name]',
        location: '[PLACEHOLDER: City, ON]',
        date: '[PLACEHOLDER: Month 20XX]',
        record: '[PLACEHOLDER: 0-0-0]',
        awards: [
          {
            award: '[PLACEHOLDER: Award name]',
            detail: '[PLACEHOLDER: One line on why it was won.]',
            standout: true,
          },
        ],
      },
      {
        event: '[PLACEHOLDER: Ontario Provincial Championship]',
        location: '[PLACEHOLDER: City, ON]',
        date: '[PLACEHOLDER: Month 20XX]',
        awards: [{ award: '[PLACEHOLDER: Award name]' }],
      },
    ],
  },
  {
    year: '2024-25',
    game: 'INTO THE DEEP',
    robot: '[PLACEHOLDER: Robot name]',
    robotSlug: 'into-the-deep-robot',
    competitions: [
      {
        event: '[PLACEHOLDER: Qualifier name]',
        location: '[PLACEHOLDER: City, ON]',
        date: '[PLACEHOLDER: Month 20XX]',
        awards: [{ award: '[PLACEHOLDER: Award name]' }],
      },
    ],
  },
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
  // [PLACEHOLDER] Replace with real events.
  {
    title: '[PLACEHOLDER: Elementary school STEM demo]',
    date: '[PLACEHOLDER: Month 20XX]',
    audience: '[PLACEHOLDER: ~80 students, grades 4-6]',
    description:
      '[PLACEHOLDER: What the team did, who it reached, and what came of it. Two or three sentences.]',
    image: null as string | null,
  },
  {
    title: '[PLACEHOLDER: Community robotics showcase]',
    date: '[PLACEHOLDER: Month 20XX]',
    audience: '[PLACEHOLDER: Open to the public]',
    description: '[PLACEHOLDER: Description of the event.]',
    image: null as string | null,
  },
  {
    title: '[PLACEHOLDER: FLL team mentorship]',
    date: '[PLACEHOLDER: Ongoing]',
    audience: '[PLACEHOLDER: 2 rookie FIRST LEGO League teams]',
    description: '[PLACEHOLDER: Description of the mentorship.]',
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
    name: 'Title',
    // [PLACEHOLDER] Set real amounts, or delete the line if the team would
    // rather not publish them.
    contribution: '[PLACEHOLDER: $2,500+]',
    benefits: [
      'Largest logo placement on the robot and team apparel',
      'Named recognition in the engineering portfolio and at every event',
      'Featured placement on this website',
    ],
    members: [],
  },
  {
    name: 'Gold',
    contribution: '[PLACEHOLDER: $1,000+]',
    benefits: [
      'Logo on the robot and team apparel',
      'Recognition in the engineering portfolio',
      'Logo on this website',
    ],
    members: [],
  },
  {
    name: 'Silver',
    contribution: '[PLACEHOLDER: $500+]',
    benefits: ['Logo on team apparel', 'Logo on this website'],
    members: [],
  },
  {
    name: 'Community',
    contribution: '[PLACEHOLDER: Any amount, or an in-kind donation]',
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
  { label: 'Awards', href: '/awards/' },
  { label: 'Gallery', href: '/gallery/' },
  { label: 'Updates', href: '/updates/' },
  { label: 'Outreach', href: '/outreach/' },
  { label: 'Sponsors', href: '/sponsors/' },
  { label: 'Contact', href: '/contact/' },
];
