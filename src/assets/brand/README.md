# Brand assets

`logo.svg` is the team mark. It is the only file the site needs.

## Replacing it

Save the new file here as `logo.svg`. `.png`, `.webp`, `.avif`, and `.jpg`
also work; if more than one `logo.*` is present the SVG wins, then AVIF,
WebP, PNG, JPG.

That is the whole process. The header, the footer, the home page hero, the
browser tab icon, and the link-preview image all switch over automatically.
There is no list to update and no other file to edit.

## Two things that were wrong with the original exports

Both the first PNG and the first SVG had the same two problems. If you
re-export, avoid them and there is nothing else to do:

**1. A baked-in black background.** Both files painted a solid black
rectangle across the whole canvas rather than leaving it transparent. The
site background is dark navy (`#070F1C`), not black, so the mark showed up
inside a visible dark square. In the SVG this was one `fill="#000000"` path
tracing the full viewBox; it was removed. When exporting, turn off any
artboard or background fill.

**2. The artwork only filled about half the canvas.** It sat in a 1095x1095
square with roughly 200 units of empty space above and below, while the mark
itself is landscape, about 1.31:1. Anything sizing it to a square box then
letterboxed it, so it rendered much smaller than the space it occupied. Fixed
by cropping the `viewBox` to the artwork (verified with `getBBox()` in a
browser: nothing is clipped on any side). When exporting, trim to the
artwork bounds.

## Colours in the mark

Sampled from the artwork, and these drive the site palette:

| Hex | Where |
|---|---|
| `#FFA101` | The 35858 numerals and the band |
| `#4598F4` | The swoosh and dot pattern |
| `#092745` | The robot body and halftone |
| `#FBF9F8` | Highlights (Bright Snow, matching the guide) |

Note the mark uses a true **orange**, not the branding guide's School Bus
Yellow `#FEC601`. The site follows the mark. See the "Design and brand notes"
section of the main README for why, and for the one place yellow survives.

## Other brand files

Sponsor-facing artwork, print versions, and anything else that should be
served untouched rather than resized belongs in `public/images/` instead.
Files in `src/assets/` are processed by the build; files in `public/` are not.
