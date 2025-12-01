// Nombre de la caché (cambiar versión si actualizas recursos)
const CACHE_NAME = "agenda-docente-v1";

// Archivos a cachear (ajusta nombres si cambias rutas/archivos)
const ASSETS_TO_CACHE = [
  "./",
  "./agenda%20docente.html",
  "./agenda%20docente%20service.html",
  "./manifest.webmanifest",
  "./offline.html",
  "./icon-192.png",
  "./icon-512.png"
];

// Instalar: guardar archivos en caché
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE.map(u => decodeURIComponent(u))).catch((err) => {
        // En casos de archivos faltantes, no romper la instalación completa
        console.warn("Error al cachear algunos activos:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activar: limpiar cachés antiguas si se actualiza la versión
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Estrategia: Cache primero, luego red, con fallback a offline.html
self.addEventListener("fetch", (event) => {
  // Solo manejar GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devuelve desde cache inmediatamente y también intenta actualizar en background
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, respClone);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // No está en cache -> intenta la red
      return fetch(event.request).then((networkResponse) => {
        // si OK, guarda en cache una copia
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si falla la red, devuelve la página offline (si aplica)
        return caches.match("./offline.html");
      });
    })
  );
});