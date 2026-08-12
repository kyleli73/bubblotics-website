#!/usr/bin/env bash
#
# Rebuild the scouting app and copy it into this site, so it is served at
# /scout/ alongside the rest of the pages.
#
#   ./scripts/sync-scouting-app.sh
#
# ── Why the built app is committed here ────────────────────────────────
# The scouting app is its own project in its own folder. GitHub Actions
# builds this website, and it has no access to that folder, so it cannot
# build the app itself. Committing the built output is the trade: one
# repository, one deploy, no second hosting account for a future team to
# inherit and lose the password to.
#
# The cost is that the copy here goes stale the moment the app changes.
# Re-run this script after any change you want live, and commit the result.
#
# ── Why --base=./ ──────────────────────────────────────────────────────
# Relative asset paths, so the same build works whether the site is served
# from a subfolder (kyleli73.github.io/bubblotics-website/scout/) or from a
# domain root (bubblotics.ca/scout/). The app uses HashRouter, so every
# route lives in the URL fragment and the document path never changes,
# which is what makes relative paths safe here.

set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${1:-$HOME/Claude's Plan}"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "Scouting app not found at: $APP_DIR"
  echo "Pass its path as the first argument:"
  echo "  ./scripts/sync-scouting-app.sh /path/to/scouting-app"
  exit 1
fi

echo "Building scouting app from: $APP_DIR"
( cd "$APP_DIR" && npx vite build --base=./ )

echo "Copying into $SITE_DIR/public/scout/"
rm -rf "$SITE_DIR/public/scout"
mkdir -p "$SITE_DIR/public/scout"
cp -R "$APP_DIR/dist/." "$SITE_DIR/public/scout/"

# Keep it out of search results. The data behind the app is readable by
# anyone who has the link, so it should not turn up in a Google search.
python3 - "$SITE_DIR/public/scout/index.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
if 'noindex' not in s:
    s = s.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />', 1)
    open(p, 'w').write(s)
    print('  added noindex')
else:
    print('  noindex already present')
PY

echo
echo "Done. Now commit:"
echo "  git add public/scout && git commit -m 'Update scouting app build'"
