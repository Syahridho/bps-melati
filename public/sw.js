/**
 * Service Worker untuk Web Push (VAPID) — Melati.
 * Dilegani dari origin root (public/) agar scope '/' mencakup seluruh aplikasi.
 * Tidak di-bundle oleh Vite; disajikan sebagai file statis.
 */

const CACHE_NAME = 'melati-push-v1';

// Daftar aset statis yang boleh di-cache (opsional; tidak digunakan untuk push utama).
const STATIC_ASSETS = [];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
            );
        }),
    );
});

/**
 * Cek apakah ada tab Melati yang terbuka dan fokus.
 * Jika iya, jangan tampilkan notifikasi sistem (Reverb yang menangani realtime saat tab terbuka).
 */
async function isAppVisible() {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    return clients.some((client) => client.visibilityState === 'visible' && client.focused);
}

/**
 * Event push: terima payload JSON dari server, tampilkan notifikasi sistem.
 */
self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let data;
    try {
        data = event.data.json();
    } catch (err) {
        console.error('[Melati SW] Gagal parsing payload push:', err);
        return;
    }

    console.log('[PUSH-TIMING] T4 push event received in SW', {
        ticket_number: data.ticket_number ?? null,
        tag: data.tag || 'melati-notification',
        t4: Date.now(),
    });

    const title = data.title || 'Notifikasi Melati';
    const options = {
        body: data.body || '',
        icon: data.icon || '/logo-melati.png',
        badge: data.badge || '/logo-melati.png',
        tag: data.tag || 'melati-notification',
        renotify: data.renotify !== false,
        data: data.data || {},
        vibrate: [200, 100, 200],
    };

    const promiseChain = (async () => {
        console.log('[PUSH-TIMING] T5 showNotification called', {
            title,
            tag: data.tag || 'melati-notification',
            t5: Date.now(),
        });

        await self.registration.showNotification(title, options);
    })();

    event.waitUntil(promiseChain);
});

/**
 * Event notificationclick: tutup notifikasi, buka/fokuskan tab Melati ke data.url.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : '/';

    const promiseChain = (async () => {
        // Coba fokuskan tab yang sudah terbuka dengan origin yang sama.
        const clients = await self.clients.matchAll({
            includeUncontrolled: true,
            type: 'window',
        });

        for (const client of clients) {
            if (client.url.startsWith(self.location.origin)) {
                await client.focus();
                // Navigasi ke URL detail tiket via postMessage ke client yang fokus.
                await client.postMessage({ type: 'NAVIGATE_TO', url });
                return;
            }
        }

        // Tidak ada tab terbuka, buka jendela baru.
        await self.clients.openWindow(url);
    })();

    event.waitUntil(promiseChain);
});

/**
 * Event pushsubscriptionchange: subscription berubah (mis. browser rotate kunci),
 * subscribe ulang dan kirim ke server.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        (async () => {
            try {
                const newSubscription = await self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(self.__VAPID_PUBLIC_KEY || ''),
                });

                // Kirim subscription baru ke server. Endpoint dipastikan ada di halaman;
                // di sini cuma catat ke console karena SW tidak punya akses ke state React.
                console.log('[Melati SW] Subscription baru:', newSubscription.endpoint);
            } catch (err) {
                console.error('[Melati SW] Gagal subscribe ulang:', err);
            }
        })(),
    );
});

/**
 * Konversi base64url (VAPID public key) ke Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
    if (!base64String) {
        return null;
    }

    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Event message: terima pesan dari halaman (mis. set VAPID public key).
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_VAPID_PUBLIC_KEY') {
        self.__VAPID_PUBLIC_KEY = event.data.key;
    }
});
