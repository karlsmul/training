const CACHE_NAME = 'krafttraining-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
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

// Fetch - Versuche zuerst Cache, dann Netzwerk
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

  // Nur lokale App-Dateien cachen
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - gib die gecachte Response zurück
        if (response) {
          return response;
        }

        // Clone die Request - eine Request ist ein Stream und kann nur einmal verwendet werden
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Prüfe ob valide Response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Nur lokale Dateien cachen (gleiche Domain)
          if (url.origin === location.origin) {
            // Clone die Response - eine Response ist ein Stream und kann nur einmal verwendet werden
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch(() => {
          // Netzwerkfehler - zeige Offline-Nachricht nur für lokale Anfragen
          if (url.origin === location.origin) {
            return new Response('Offline - Bitte überprüfe deine Internetverbindung', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          }
          throw new Error('Network error');
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
