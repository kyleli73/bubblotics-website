# Bubblotics — Team 35858 Website

The team website. Robots, awards, outreach, updates, and sponsorship.

This README is written for someone who has never built a website. If you can
edit a text file and click a few buttons on GitHub, you can maintain this
site. You do not need to understand the code.

---

## Table of contents

1. [What this is built with](#what-this-is-built-with)
2. [Running it on your own computer](#running-it-on-your-own-computer)
3. [The three files you will actually edit](#the-three-files-you-will-actually-edit)
4. [Adding a blog post](#adding-a-blog-post)
5. [Adding a robot page](#adding-a-robot-page)
6. [Adding an Onshape CAD viewer](#adding-an-onshape-cad-viewer)
7. [Adding photos](#adding-photos)
8. [Updating awards, sponsors, and contact info](#updating-awards-sponsors-and-contact-info)
9. [Publishing changes](#publishing-changes)
10. [First-time GitHub Pages setup](#first-time-github-pages-setup)
11. [Finding every placeholder](#finding-every-placeholder)
12. [Design and brand notes](#design-and-brand-notes)
13. [When something breaks](#when-something-breaks)

---

## What this is built with

**[Astro](https://astro.build)**, a tool that turns a folder of files into a
plain website. Nothing runs on a server. The published site is just HTML, CSS,
and a small amount of JavaScript, which is why it is free to host and very
hard to break.

Why Astro rather than hand-written HTML: adding a blog post or a robot page
means adding **one markdown file**. The page, the card on the index, and the
sorting all happen by themselves. With plain HTML you would copy an entire
page, edit it, then hand-edit the index too, and the nav bar would be
duplicated across fifteen files. By season three that is a real burden on
whoever inherits this.

The full dependency list is four packages:

| Package | What it does |
|---|---|
| `astro` | Builds the site |
| `gsap` | Scroll animations and the counting stat numbers |
| `lenis` | Smooth scrolling |
| `@fontsource-variable/source-sans-3` | The body typeface from the branding guide |

---

## Running it on your own computer

You need **Node.js 20 or newer**. Get it from [nodejs.org](https://nodejs.org)
(pick the LTS version) and install it like any other program.

Then, in a terminal, from this folder:

```bash
npm install
```

That downloads the four packages above. It takes a minute or two, and you only
have to do it once (or again after someone changes `package.json`).

```bash
npm run dev
```

That starts a local preview at **http://localhost:4321**. Open it in a
browser. Edit any file, save, and the page updates instantly without you
reloading.

Press `Ctrl+C` in the terminal to stop it.

Other commands:

```bash
npm run build
```

Builds the finished site into a `dist/` folder. You rarely need this; GitHub
does it for you on every push. It is useful to check a change actually builds
before you push it.

```bash
npm run check
```

Checks for type errors and broken references. Worth running if a build fails
and the error is unclear.

---

## The three files you will actually edit

Almost everything you will ever want to change lives in one of these:

| File | What it controls |
|---|---|
| `src/data/site.ts` | Team facts, stats, awards, outreach events, sponsors, contact details, nav menu |
| `src/content/updates/` | Blog posts, one markdown file each |
| `src/content/robots/` | Robot pages, one markdown file each |

Photos go in `src/assets/`. Everything else is layout and styling you can
leave alone.

---

## Adding a blog post

1. Go to `src/content/updates/`.
2. Copy `welcome-to-the-new-site.md` and rename the copy.
   The filename becomes the web address, so use lowercase words with hyphens:
   `provincials-recap.md` becomes `/updates/provincials-recap/`.
   No spaces, no capitals, no apostrophes.
3. Edit the block at the top, between the two `---` lines:

```yaml
---
title: 'Provincials recap'
date: 2026-03-14          # YYYY-MM-DD. Sorts the post and shows as the date.
excerpt: >-
  Two lines that show on the listing page. This is what makes someone click.
tags:
  - Competition
author: 'Team 35858'
draft: false              # true keeps it hidden while you write
---
```

4. Write the post underneath in Markdown:

```markdown
## A heading

A paragraph. **Bold text** and *italics* work.

- A bullet
- Another bullet

[A link](../robots/)
```

5. Save. If `npm run dev` is running, the post is already on the Updates page.

To add a cover photo, put the image in `src/assets/updates/` and add these two
lines to the block at the top:

```yaml
coverImage: '../../assets/updates/provincials.jpg'
coverImageAlt: 'Our robot scoring during the semifinal match.'
```

The `Alt` line is the description read aloud to blind visitors. Always write
one. Describe what is happening, not "photo of robot".

---

## Adding a robot page

Same idea, in `src/content/robots/`.

1. Copy `decode-robot.md` and rename it to the robot's name in lowercase with
   hyphens (`voyager.md` becomes `/robots/voyager/`).
2. Fill in the block at the top. The fields that matter most:

```yaml
name: 'Voyager'
season: 'DECODE'          # The FTC game that year
year: '2025-26'
order: 5                  # Higher = newer. One more than last season's.
featured: true            # Only ONE robot should have this
summary: >-
  One or two sentences on what makes this robot different.
results:
  - 'Inspire Award, Ontario Provincials'
specs:
  - label: 'Drivetrain'
    value: 'Mecanum'
```

3. **Set `featured: false` on last year's robot** when you add a new one.
   The featured robot leads the Robots page and appears on the home page.
   Two featured robots means the older one silently wins.
4. Write the engineering notes underneath. That section renders under a
   heading telling the reader it is for judges and for next year's team, so
   write it that way: what you built, why, what you tried first, and what you
   would change. Judges reward documented iteration more than a clean final
   answer, so the version that failed is worth writing about.

Add a photo the same way as a blog post, using `heroImage` and
`heroImageAlt`, with the file in `src/assets/robots/`.

---

## Adding an Onshape CAD viewer

Any robot page can carry a live, rotatable 3D view of the actual Onshape
document. Visitors can spin it, zoom, and open the assembly tree. It stays in
sync with Onshape automatically, so updating the CAD updates the website with
no extra step.

There is no export and no 3D file to maintain. There is one catch: **the
document has to be shared publicly.** An embed of a private document shows
visitors an Onshape sign-in screen.

### Step 1 — decide whether to share it

Making a document public means anyone with the link can view and copy your
CAD. Most FTC teams publish theirs, and many treat it as part of open-source
outreach. It is still a team decision, and it is worth making deliberately
rather than by accident.

If you would rather not, skip this section. Leave `onshapeEmbedUrl` out of the
markdown file and the CAD section simply does not appear on that page.

### Step 2 — make the document public

1. Open the document in Onshape.
2. Click the **Share** button, top right.
3. Open the **Link sharing** tab.
4. Turn on link sharing and set the permission to **Can view** (not "Can
   edit").
5. Apply.

> If the Share dialog does not offer link sharing, the document is probably
> owned by a company or classroom account with sharing restricted. An Onshape
> admin or your mentor has to allow it.

### Step 3 — copy the link

With sharing on, copy the document's URL straight from the browser address
bar. It looks like:

```
https://cad.onshape.com/documents/a1b2c3d4e5f6/w/7g8h9i0j/e/k1l2m3n4
```

### Step 4 — put it in the markdown file

Add these two lines to the robot's markdown block:

```yaml
onshapeEmbedUrl: 'https://cad.onshape.com/documents/a1b2c3d4e5f6/w/7g8h9i0j/e/k1l2m3n4'
onshapeCaption: 'Full competition assembly as of provincials.'
```

Save, and the CAD section appears on that robot's page, framed in the team's
colours with a glow behind it.

### Step 5 — check it in a private window

This is the step people skip, and it is the one that catches the mistake.
Open the page in a **private/incognito window**, where you are not logged into
Onshape. If you see the model, visitors will too. If you see a sign-in screen,
sharing did not save correctly. Go back to step 2.

### Want the fully custom "hologram" look?

Transparent glowing materials, click-to-isolate subsystems, an animated
exploded view. That needs exporting the geometry from Onshape as `.glb` and
rendering it with Three.js, which is considerably more work and one more thing
to keep in sync every time the CAD changes. The Onshape embed gets you most of
the way for a fraction of the effort. Ask before building it, and build it for
the flagship robot only.

---

## Adding photos

Drop image files into `src/assets/gallery/`. That is the whole process. They
appear in the gallery on their own, no list to update.

Two things matter:

**Name the files descriptively.** The filename becomes the caption and the
alt text. `provincials-2026-pit.jpg` becomes "Provincials 2026 pit".
`IMG_4471.jpg` becomes "Img 4471", which is useless to a blind visitor and
looks careless to everyone else.

**Do not compress them first.** Astro resizes and compresses every image at
build time and generates smaller versions for phones. Upload the full-quality
original and let it do the work.

Photos used in a specific place (a robot hero, a post cover) go in
`src/assets/robots/` or `src/assets/updates/` instead, and get referenced from
that page's markdown.

---

## Updating awards, sponsors, and contact info

All of it is in **`src/data/site.ts`**. Open it and read the comments; every
section explains what it controls.

### After a competition

Find the `seasons` array and add the event:

```ts
{
  event: 'Ontario Provincial Championship',
  location: 'Toronto, ON',
  date: 'March 2026',
  record: '7-3-0, ranked 4th of 36',
  awards: [
    {
      award: 'Inspire Award',
      detail: 'For outstanding documentation and outreach.',
      standout: true,      // gold treatment; save it for results that matter
    },
  ],
},
```

An event where you won nothing is still worth listing. The page says so
plainly rather than hiding it, which is both more honest and more useful.

The totals on the Awards page are calculated from this list, so they can never
disagree with it.

### Adding a sponsor

Find `sponsorTiers` and add to the right tier's `members`:

```ts
members: [
  { name: 'Acme Manufacturing', logo: '/images/sponsors/acme.png', url: 'https://acme.com' },
],
```

Put the logo file in `public/images/sponsors/`. Note the path starts with `/`
and has no `public` in it: that folder is served as the site root.

A tier with no members shows an honest "be the first" slot rather than a gap.

### Changing contact details

The `contact` block. Instagram and email are already set. YouTube and GitHub
are switched off, because a link with `handle: null` is skipped everywhere.
Fill in a handle to turn one on.

---

## Publishing changes

Every push to the `main` branch rebuilds and republishes the site
automatically. It takes about a minute.

### From GitHub's website (no terminal)

Best for a quick text fix.

1. Find the file on github.com.
2. Click the pencil icon.
3. Make the change.
4. Scroll down, write a short note in the commit box ("Add provincials
   recap"), and click **Commit changes**.
5. The **Actions** tab shows the rebuild. Green tick means it is live.

### From your computer

```bash
git add .
git commit -m "Add provincials recap"
git push
```

### If the site does not update

Open the **Actions** tab on GitHub. A red X means the build failed, and
clicking into it shows the error. The usual cause is a typo in the block at
the top of a markdown file: a missing quote, a bad date, or a `-` where a
space should be. The error message names the file.

A failed build never replaces the live site, so a mistake takes the change
offline, not the whole website.

---

## First-time GitHub Pages setup

Only needed once, by whoever creates the repository.

1. Push this project to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to **GitHub Actions**.
   Not "Deploy from a branch". That is the older method and it ignores the
   workflow in this project entirely.
4. Open `astro.config.mjs` and set the two values at the top:

```js
const SITE = 'https://YOUR-USERNAME.github.io';
const BASE = '/YOUR-REPO-NAME';
```

`BASE` must match the repository name exactly, including capitalisation. If
you use a custom domain (`bubblotics.ca`) or a user site
(`username.github.io` with no repo path), set `BASE` to `'/'` instead.

**Getting `BASE` wrong is the single most common GitHub Pages mistake.** The
site loads, but every stylesheet, image, and link 404s. If the published site
appears as unstyled black text on white, this is why.

5. Push a commit. Watch the **Actions** tab. When it goes green, the site is
   live at the URL shown under Settings → Pages.

---

## Finding every placeholder

Anything not yet written is marked `[PLACEHOLDER]`. To list them all:

```bash
grep -rn "PLACEHOLDER" src/
```

On the live site they show as yellow dashed outlines, so they are hard to miss
while reading a page.

The most important ones to fill in first:

- `src/data/site.ts` — city, rookie year, the four stat numbers, and the
  `seasons` array
- `src/content/robots/*.md` — the two robot files are entirely templates
- `src/assets/gallery/` — empty; the gallery shows placeholder tiles until
  photos are added
- `src/components/Logo.astro` — a stand-in mark, because the branding guide
  lists the logo as still to do

---

## Design and brand notes

Colours come from the **Bubblotics Branding Guide 26-7** and are declared once
at the top of `src/styles/global.css`:

| Name | Hex | Where it is used |
|---|---|---|
| Prussian Blue | `#102542` | Page and panel backgrounds |
| Cornflower Blue | `#5995ED` | Accents, links, glow |
| School Bus Yellow | `#FEC601` | Highlights, primary buttons, standout awards |
| Platinum | `#EFF2F1` | Light surfaces |
| Bright Snow | `#FCFAF9` | Body text on dark |

The guide's rule is followed throughout: headers in blue with yellow accents,
long text as a primary colour on a neutral. Yellow is deliberately sparse. It
marks the one thing that matters on a screen, and it stops meaning anything
the moment it is everywhere.

**Typefaces.** Source Sans 3 for body copy, as the guide specifies. The guide
names "Nelvetica Neue" for headlines, which is not available as a web font, so
`--font-display` in `global.css` uses the closest neo-grotesque stack
(Helvetica Neue and friends), which renders natively on Apple devices with no
download. If the team licenses the real face, drop the files into
`public/fonts/`, add an `@font-face` block, and put its name at the front of
`--font-display`. Nothing else changes.

**Animation.** All of it is in `src/scripts/motion.ts`, driven by HTML
attributes so no page imports the animation library directly:

| Attribute | Effect |
|---|---|
| `data-reveal` | Fades and rises in when scrolled into view |
| `data-reveal="left"` / `"right"` / `"scale"` | Different entrances |
| `data-stagger` | Children animate one after another |
| `data-parallax="0.3"` | Drifts against the scroll |
| `data-count="12"` | Counts up from zero when scrolled into view |
| `data-magnetic` | Leans toward the cursor |

Anyone whose system asks for reduced motion gets the finished page instantly
with no movement at all. That is a correctness requirement, not a preference:
this kind of motion causes real nausea for some people. If you add animation,
keep it working.

**Accessibility.** Semantic HTML, alt text on every image, keyboard-navigable
nav with a visible focus ring, 44px minimum touch targets, and contrast ratios
checked against the dark background. If you change a colour, check the
contrast. Half of any FTC audience is reading this on a phone in a bright gym.

---

## When something breaks

**The build fails after I edited a markdown file.**
Almost always the block at the top. Check that every value with a colon in it
is wrapped in quotes, dates are `YYYY-MM-DD`, and indentation uses spaces
rather than tabs. The error names the file and usually the field.

**A new post or robot is not showing up.**
Check `draft: false`. Check the file is in the right folder and ends in `.md`.

**The published site has no styling.**
`BASE` in `astro.config.mjs` does not match the repository name. See
[First-time GitHub Pages setup](#first-time-github-pages-setup).

**Animations are not running.**
Check whether your system has "reduce motion" turned on, because the site
honours it. Otherwise open the browser console (F12) and look for an error.
The animation code catches its own failures and reveals all content
unanimated, so a broken animation should never hide the page.

**`npm install` fails.**
Check Node is installed with `node --version`. It must be 20 or newer. On a
slow or restricted network the download can time out; try again, or run
`npm install --fetch-timeout=600000`.

**I want a contact form that actually submits.**
The current form opens the visitor's email app with the message pre-written.
It has no server behind it, because a static site has none. To get real
submissions, sign up for [Formspree](https://formspree.io) and point the
`<form>` in `src/pages/contact.astro` at their endpoint. The trade-off is a
third-party account that a future team has to keep access to, which is exactly
why it was not done that way to begin with.

---

## Project layout

```
src/
  data/site.ts          Team facts, stats, awards, sponsors, contact, nav
  content/
    robots/*.md         One file per robot -> one page each
    updates/*.md        One file per blog post -> one page each
  content.config.ts     The rules those markdown files must follow
  pages/                One file per page of the site
    index.astro         Home
    about.astro         Our Story
    robots/index.astro  Robots listing
    robots/[id].astro   Template every robot page is built from
    awards.astro
    gallery.astro
    updates/index.astro
    updates/[id].astro  Template every blog post is built from
    outreach.astro
    sponsors.astro
    contact.astro
    404.astro
  components/           Reusable pieces: header, footer, cards, bubbles
  layouts/BaseLayout    The frame every page sits inside
  styles/global.css     Every colour, size, and shadow, declared once
  scripts/motion.ts     All animation
  assets/               Photos. Astro compresses these at build time.
public/                 Files served as-is: favicon, sponsor logos
.github/workflows/      The automatic deploy
```
