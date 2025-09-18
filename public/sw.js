// Basic Service Worker for PWA functionality
const CACHE_NAME = "nutriscan-ai-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating");
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the client to skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Basic fetch event - only handle essential offline functionality
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests for Firebase
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.startsWith("blob:")
  ) {
    return;
  }

  // For navigation requests when offline, you could serve a custom offline page
  if (event.request.mode === "navigate" && !navigator.onLine) {
    // You could return a cached offline page here if needed
    console.log("Offline navigation request");
  }
});

// Background sync for offline meal saving
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Background sync triggered");
    // Handle offline meal data sync when connection is restored
  }
});

// Push notifications (for future features)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icon-192x192.jpg",
      badge: "/icon-192x192.jpg",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Listen for messages from the client to skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Claim control when activated
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});

// Background sync for offline meal saving
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Background sync triggered");
    // Handle offline meal data sync when connection is restored
  }
});

// Push notifications (for future features)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icon-192x192.jpg",
      badge: "/icon-192x192.jpg",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});
