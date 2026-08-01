# Brand assets

## The logo — save it here

Save the team logo in this folder as:

    logo.png

`.svg`, `.webp`, `.jpg`, and `.avif` also work. SVG is best if you have a
vector version, because it stays perfectly sharp at every size.

**That is the whole process.** The header, the footer, the home page hero,
the browser tab icon, and the image that shows when someone shares a link
all switch over to it automatically. There is no list to update and no
other file to edit.

Until this file exists, the site uses a plain placeholder mark, so nothing
ever renders as a broken image.

## Which file to export

The mark is used at roughly 46px in the header and 132px in the hero, and
Astro resizes it at build time, so export generously:

- **SVG** — ideal. Any size, smallest file.
- **PNG** — export at 1024px or larger, with a **transparent background**.
  The site is dark navy; a white box around the logo will be obvious.

## Other brand files

Sponsor-facing artwork, print versions, and anything else that is served
untouched rather than resized belongs in `public/images/` instead. Files in
`src/assets/` get processed by the build; files in `public/` do not.
