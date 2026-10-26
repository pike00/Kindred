// Imported by the generated worker before routing is installed. Keep this
// migration in subsequent releases: infrequent clients may upgrade from v1.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("api-cache"))
})

self.addEventListener("message", (event) => {
  if (event.data === "KINDRED_PRIVATE_NETWORK_ONLY_V1") {
    event.waitUntil(
      caches.delete("api-cache").then(() => {
        event.ports[0]?.postMessage("KINDRED_PRIVATE_NETWORK_ONLY_V1")
      }),
    )
  }
})

// Repeat cleanup after taking control, including an old worker's last writes.
// Private requests are NetworkOnly and can never read this legacy cache.
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).pathname.startsWith("/api/")) {
    event.waitUntil(caches.delete("api-cache"))
  }
})
