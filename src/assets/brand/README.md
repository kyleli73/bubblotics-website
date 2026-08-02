# Brand assets

## Files in here

| File | What it is |
|---|---|
| `logo.png` | **The one the site uses.** Transparent background. |
| `logo-source-black-background.png` | The original as supplied, untouched. Kept for reference. |

## Why there are two

The logo was originally exported as RGB with **no alpha channel**, so its
background was baked in as solid black rather than being transparent.

The site background is dark navy (`#070F1C`), not black. A black-backed image
on a navy page shows as a visible dark square around the mark. It is subtle
enough to miss on a laptop and obvious on a phone in a bright room.

So `logo.png` was regenerated as RGBA with the pure-black pixels keyed to
transparent. Only exact `(0, 0, 0)` was removed, which was 64.2% of the image.
The darkest colour in the artwork itself is a navy, well clear of zero, so
nothing in the mark was altered.

**If you re-export the logo, export it with a transparent background** and
simply overwrite `logo.png`. Then none of the above applies. In Illustrator or
Figma that means turning off any artboard or background fill before exporting
PNG. Better still, export SVG.

## Replacing the logo

Save it here as `logo.png`. `.svg`, `.webp`, `.jpg`, and `.avif` also work.

That is the whole process. The header, the footer, the home page hero, the
browser tab icon, and the link-preview image all switch over automatically.
There is no list to update and no other file to edit.

**SVG is the best format if you have a vector version.** It stays perfectly
sharp at any size, the file is far smaller, and there is no background to key
out. The current PNG is 2000x2000 and 404 KB; the same mark as SVG would
likely be under 20 KB.

If you only have raster, export at 1024px or larger with a transparent
background. Astro resizes it at build time, so a large source costs nothing at
page load.

## Other brand files

Sponsor-facing artwork, print versions, and anything else that should be
served untouched rather than resized belongs in `public/images/` instead.
Files in `src/assets/` are processed by the build; files in `public/` are not.
