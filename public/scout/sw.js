/*
 * THE SERVICE WORKER — what makes the app open with no signal.
 *
 * WHAT A SERVICE WORKER IS
 * A small script the browser installs the first time someone visits, and then
 * keeps, even after the tab is closed. From then on it sits between the app and
 * the network and gets to answer requests itself. That's what lets a plain
 * website open with no connection at all.
 *
 * WHY THIS APP NEEDS ONE
 * Scouting entries were already safe offline in IndexedDB. But that only helps
 * once the app is RUNNING. The app's own files — HTML, JavaScript, CSS — still
 * came from the network every time, so a scout who closed the tab and reopened
 * it in a gym with no wifi would get a blank page, with their queued entries
 * stranded behind it. This file closes that gap.
 *
 * WHY IT IS HAND-WRITTEN RATHER THAN GENERATED
 * The usual tool (Workbox, via vite-plugin-pwa) bakes absolute file paths into
 * single-quoted strings. This project lives in a folder called "Claude's Plan",
 * and that apostrophe ends the string early and breaks the generated file. This
 * version has no build step and no dependency, so nothing can trip on the path.
 *
 * TWO CACHING STRATEGIES, AND WHY EACH IS USED WHERE IT IS
 *
 *   Page loads  -> NETWORK FIRST, falling back to cache.
 *     We want a phone that has signal to pick up a new deploy immediately. If
 *     the network fails, we serve the last good copy. Result: always current
 *     when online, always working when not.
 *
 *   Built assets -> CACHE FIRST.
 *     Vite fingerprints these (index-D3zsZ8w7.js), so a given URL's contents
 *     can never change. Once cached, serving from disk is both correct and
 *     instant. A new deploy produces new filenames, which miss the cache and
 *     get fetched normally.
 *
 * WHAT IS DELIBERATELY NOT CACHED
 * Anything from Supabase or FTCScout. A stale match schedule or stale OPR is
 * worse than an honest failure — the sync queue already knows how to retry, and
 * silently serving yesterday's data would be genuinely misleading.
 */

const VERSION = 'v1';
const CACHE = `bubblotics-scouting-${VERSION}`;

// Take over as soon as a new version is installed, rather than waiting for
// every tab to close. Combined with network-first page loads, this means a
// deploy reaches phones on their next refresh.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Warm the cache with the app shell so the very first offline load works even
  // if the scout never navigated anywhere else.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html']).catch(() => {})),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions so phones don't accumulate dead copies.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle GETs from our own origin. POSTs to Supabase, and every
  // third-party request, pass straight through untouched.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // --- Page loads: network first ---
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          // Offline. Serve the last good copy of the app shell. Routing lives
          // after the '#', so index.html is the right answer for every route.
          const cached = await caches.match('./index.html');
          return (
            cached ??
            new Response('<h1>Offline</h1><p>Open this once with a connection first.</p>', {
              headers: { 'Content-Type': 'text/html' },
              status: 503,
            })
          );
        }
      })(),
    );
    return;
  }

  // --- Built assets: cache first ---
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        // Only store real successes. Caching an error page would poison the
        // cache for as long as the filename lives.
        if (fresh.ok && fresh.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        // Nothing cached and no network. Let it fail honestly.
        return new Response('', { status: 504 });
      }
    })(),
  );
});
