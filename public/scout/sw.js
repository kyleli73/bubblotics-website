/*
 * Retires the old copy of the scouting app.
 *
 * Before the scouting app moved to scouting.bubblotics.ca, a copy of it was
 * served from bubblotics.ca/scout/. That copy installed a service worker (a
 * script the browser keeps and uses to run the app offline), and it was built
 * for DECODE. Deleting its files is not enough to get rid of it: a phone that
 * installed it keeps serving the cached app, and a scout using it at a BIOBUZZ
 * event would send DECODE-shaped entries into the live database.
 *
 * Browsers re-download a service worker's script to check for updates. This
 * file is what they now get: a replacement that installs straight away,
 * deletes the cached app, unregisters itself, and reloads the page. With no
 * worker left, the reload reaches index.html in this folder, which forwards to
 * the real app. Nothing on the phone's IndexedDB is touched.
 *
 * Safe to delete once nobody could still have the old copy installed, say
 * after the 2026-27 season.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const win of windows) win.navigate(win.url);
    })()
  );
});
