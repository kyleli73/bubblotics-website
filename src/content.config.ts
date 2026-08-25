/*
 * Content collections.
 *
 * This file is why the site is maintainable. Instead of hand-writing an HTML
 * page for every blog post and every robot, you drop a markdown file into
 * src/content/updates/ or src/content/robots/ and Astro does the rest: it
 * builds the page, adds it to the index listing, and sorts it.
 *
 * The `schema` below is a contract. If a markdown file is missing a required
 * field or has a typo in a date, `npm run build` FAILS with the filename and
 * the problem. That is on purpose. A loud build error at 11pm is much better
 * than a silently broken page discovered by a sponsor.
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const robots = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/robots' }),
  schema: ({ image }) =>
    z.object({
      // Robot's name. Shown as the page title.
      name: z.string(),

      // FTC game for that year, e.g. "DECODE", "INTO THE DEEP".
      season: z.string(),

      // Competition year label used for grouping, e.g. "2025-26".
      year: z.string(),

      // Controls ordering everywhere. Higher = newer. The newest robot is
      // treated as the flagship and gets extra treatment on the Robots page.
      order: z.number(),

      // One or two sentences. Used on the robot card and as the meta
      // description for search engines.
      summary: z.string(),

      // Main photo. Put the file in src/assets/robots/ and reference it
      // relatively, e.g. "../../assets/robots/name.jpg". Astro will compress
      // and resize it at build time.
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),

      // Headline results. Kept short; the full award list lives on /awards.
      results: z.array(z.string()).default([]),

      // Quick-reference spec table shown next to the hero.
      specs: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),

      // Onshape public share link. Leave this out and the CAD section simply
      // does not render, so an unfinished robot page still looks intentional.
      // See README, "Adding an Onshape CAD viewer", for how to generate it.
      onshapeEmbedUrl: z.string().url().optional(),
      onshapeCaption: z.string().optional(),

      // Path to an exported glTF/GLB model under public/, e.g.
      // '/models/voyager.glb'. Supplying this adds the hologram viewer:
      // a translucent, glowing render of the real geometry that can be
      // orbited, exploded, and picked apart subsystem by subsystem.
      //
      // Independent of onshapeEmbedUrl. A robot can have both (the Onshape
      // embed is always current; the hologram is a styled snapshot), either,
      // or neither. Each section only renders if its field is present.
      //
      // See the README, "Adding a hologram CAD viewer", for the export steps
      // and how to keep the file small enough to be worth downloading.
      hologramModel: z.string().optional(),
      hologramCaption: z.string().optional(),

      // Optional YouTube embed ID (just the ID, not the full URL) for a
      // reveal video or match highlight.
      videoId: z.string().optional(),

      // Set true on exactly one robot. That robot leads the Robots page and
      // is teased on the home page.
      featured: z.boolean().default(false),

      // Hides the robot from listings without deleting the file. Useful for
      // drafting next season's page during build season.
      draft: z.boolean().default(false),
    }),
});

const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),

      // Must be a real date in YYYY-MM-DD form. Drives sort order and the
      // displayed date. A typo here fails the build rather than sorting wrong.
      date: z.coerce.date(),

      // Shown on the listing page. Keep it to about two lines.
      excerpt: z.string(),

      // Free-form tags, e.g. ["Competition", "Build season"].
      tags: z.array(z.string()).default([]),

      author: z.string().default('Team 35858'),

      coverImage: image().optional(),
      coverImageAlt: z.string().optional(),

      draft: z.boolean().default(false),
    }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    /** One line shown on the docs index card. */
    summary: z.string(),
    /** Which app this documents. */
    app: z.string(),
    /** Sort order on the index. Lower first. */
    order: z.number().default(10),
    /** Live URL of the app this documents, if it has one. */
    appUrl: z.string().optional(),
    /** Season or revision, e.g. "26-7". */
    revision: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { robots, updates, docs };
