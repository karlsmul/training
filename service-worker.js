const CACHE_NAME = 'krafttraining-v40';
const urlsToCache = [
  '/style.css',
  '/app.js',
  '/sync.js',
  '/firebase-config.js',
  '/plan-analysis.js',
  '/manifest.json'
];

// Installation - Cache alle wichtigen Dateien
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache geöffnet');
        return cache.addAll(urlsToCache);
      })
  );
  // Aktiviere den neuen Service Worker sofort
  self.skipWaiting();
});

// Aktivierung - Lösche alte Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Übernehme Kontrolle über alle Clients sofort
  return self.clients.claim();
});

// Fetch - Network First für JS/CSS, NIEMALS HTML cachen
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NIE Firebase/Firestore URLs cachen!
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('gstatic.com')) {
    // Firebase-Anfragen direkt durchlassen, NICHT cachen
    event.respondWith(fetch(event.request));
    return;
  }

  // NIEMALS HTML-Dateien cachen - immer vom Server laden
  if (event.request.mode === 'navigate' || event.request.destination === 'document' ||
      url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // NETWORK FIRST Strategie für JS/CSS/andere Dateien
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Valide Response vom Netzwerk - update Cache (nur für nicht-HTML Dateien)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Netzwerk fehlgeschlagen - versuche Cache (nur für nicht-HTML Dateien)
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('Serving from cache (offline):', event.request.url);
            return cachedResponse;
          }

          // Kein Cache verfügbar
          if (url.origin === location.origin) {
            return new Response('Offline - Bitte überprüfe deine Internetverbindung', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          }
          throw new Error('Network error and no cache available');
        });
      })
  );
});

// Background Sync - für zukünftige Synchronisation
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trainings') {
    event.waitUntil(syncTrainings());
  }
});

async function syncTrainings() {
  // Placeholder für zukünftige Cloud-Sync Funktionalität
  console.log('Sync wird ausgeführt...');
  // Hier würde die Synchronisation mit dem Backend stattfinden
}
