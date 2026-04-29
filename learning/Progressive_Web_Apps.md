# 📱 PROGRESSIVE WEB APPS (PWA)

> [!TIP] > **PWA** = The reach of the Web + The capabilities of Native Apps.

---

## 1. THE THREE PILLARS

### 1.1 Reliable (Offline First)

Loads instantly, even in uncertain network conditions.

- **Key Tech**: **Service Workers**.

### 1.2 Fast

Responds quickly to user interactions with silky smooth animations.

- **Key Tech**: caching strategies, optimized rendering.

### 1.3 Engaging

Feels like a natural app on the device.

- **Key Tech**: **Web App Manifest**, Push Notifications, Home Screen Install.

---

## 2. SERVICE WORKERS

The heart of a PWA. A script that runs in the background, separate from a web page.

### 2.1 Caching Strategies

1.  **Cache First**: Good for static assets (images, CSS).
    - Check cache -> Return if found -> Else fetch network -> Update cache.
2.  **Network First**: Good for fresh data (API responses).
    - Fetch network -> Return -> Else fallback to cache.
3.  **Stale-While-Revalidate**: Hybrid.
    - Return from cache immediately -> Fetch network in background -> Update cache for next time.

```javascript
// self = service worker
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 3. WEB APP MANIFEST

A JSON file that tells the browser about your web application and how it should behave when 'installed'.

```json
{
  "name": "Learning Hub",
  "short_name": "L-Hub",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4caf50",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    }
  ]
}
```

---

## 4. MODERN CAPABILITIES (PROJECT FUGU)

The web can do more than you think.

- **File System Access API**: Read/Write files.
- **Web Bluetooth / USB**: Connect to hardware.
- **Contact Picker API**: Access contacts.
- **Badging API**: Notification dots.

---

## 5. AUDITING WITH LIGHTHOUSE

Chrome DevTools -> Lighthouse tab.
It checks:

- Is it installable?
- Is it served over HTTPS?
- Does it register a Service Worker?
- Performance score.

---

## 🎓 FLUTTER WEB & PWA

Flutter Web builds are PWAs by default!
Check `web/index.html` and `web/manifest.json` in your Flutter project.
To enable offline support, ensure `service_worker.js` is correctly configured in `index.html`.
