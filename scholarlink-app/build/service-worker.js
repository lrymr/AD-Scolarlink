const CACHE_NAME = 'scholarlink-app-shell-v1'
const CACHE_PREFIX = 'scholarlink-app-shell-'
const APP_SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const manifestResponse = await fetch('/asset-manifest.json', { cache: 'no-store' })
    if (!manifestResponse.ok) {
      throw new Error(`Unable to load the app asset manifest: ${manifestResponse.status}`)
    }

    const assetManifest = await manifestResponse.json()
    if (!Array.isArray(assetManifest.entrypoints) || assetManifest.entrypoints.length === 0) {
      throw new Error('The app asset manifest does not contain production entrypoints.')
    }

    const cache = await caches.open(CACHE_NAME)
    await cache.addAll([...new Set([...APP_SHELL_URLS, ...assetManifest.entrypoints])])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const requestUrl = new URL(request.url)

  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname === '/api' ||
    requestUrl.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
          await cache.put('/index.html', response.clone())
        }
        return response
      } catch {
        const cachedPage = await caches.match(request) || await caches.match('/index.html')
        return cachedPage || new Response('ScholarLink is offline. Reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })())
})
