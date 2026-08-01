# Sponsor logos

Files in `public/` are served exactly as-is, without processing. That is
what you want for a sponsor logo: it should render at the size and quality
they supplied.

Reference them from `src/data/site.ts` with a path starting at the site
root, with no `public` in it:

    { name: 'Acme Manufacturing', logo: '/images/sponsors/acme.png' }

Prefer .svg or a transparent .png. The logo panel on the sponsors page has
a light background, because sponsor artwork almost always arrives as dark
ink on white.
