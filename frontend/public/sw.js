// 자취생 하루 영양 채우기 - service worker
// 정적 자원: cache-first / API GET: network-first(오프라인 시 캐시) / POST: network only
const VERSION = "v1";
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;
const MAX_STATIC = 60;
const MAX_API = 40;

const OFFLINE_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>오프라인입니다</title>
<style>
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #fafafa; color: #111; font-family: system-ui, sans-serif; text-align: center; }
  main { padding: 24px; }
  h1 { font-size: 20px; }
  p { color: #666; font-size: 14px; }
  button { margin-top: 16px; padding: 10px 20px; border: 1px solid #111; background: #111; color: #fff; border-radius: 8px; font-size: 14px; }
</style>
</head>
<body>
<main>
  <h1>오프라인입니다</h1>
  <p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p>
  <button onclick="location.reload()">다시 시도</button>
</main>
</body>
</html>`;

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i + max < keys.length; i++) {
    await cache.delete(keys[i]);
  }
}

async function cleanupOldCaches() {
  for (const key of await caches.keys()) {
    if (key !== STATIC_CACHE && key !== API_CACHE) await caches.delete(key);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all([caches.open(STATIC_CACHE), caches.open(API_CACHE)]);
      await cleanupOldCaches();
      return self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      return self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 페이지 내비게이션: network-first → 캐시 → 오프라인 화면
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
            trimCache(STATIC_CACHE, MAX_STATIC);
          }
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(OFFLINE_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      })()
    );
    return;
  }

  // API GET: network-first → 캐시 (오프라인에는 마지막 성공 데이터)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            cache.put(request, fresh.clone());
            trimCache(API_CACHE, MAX_API);
          }
          return fresh;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error("offline");
        }
      })()
    );
    return;
  }

  // 정적 자원(_next/static, 이미지 등): cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          cache.put(request, fresh.clone());
          trimCache(STATIC_CACHE, MAX_STATIC);
        }
        return fresh;
      } catch {
        return new Response(null, { status: 503 });
      }
    })()
  );
});
