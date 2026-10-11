import { useEffect, useRef } from 'react';

const PING_INTERVAL_MS = 60_000;

/**
 * Menjaga `last_activity_at` tetap segar dengan memanggil `POST /session/ping`
 * setiap menit, HANYA saat tab sedang terlihat.
 *
 * Dipakai `fetch` biasa, bukan navigasi Inertia, supaya tidak memicu render
 * ulang seluruh halaman. Endpoint ini memakai middleware EnsureSingleSession
 * yang sama, sehingga aturan satu-sesi tetap ditegakkan walau WebSocket mati.
 *
 * `navigator.sendBeacon` saat tab ditutup hanya penanda tambahan dan
 * sengaja TIDAK diandalkan — sering tidak terkirim. Ambang waktu di server
 * tetap menjadi penentu yang sebenarnya.
 */
export function useSessionHeartbeat(enabled = true): void {
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const ping = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

            void fetch(route('session.ping'), {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                credentials: 'same-origin',
            }).catch(() => {
                // Jaringan putus sementara tidak apa-apa: ambang waktu di server
                // tetap menjaga status, dan middleware menegakkan aturan.
            });
        };

        const stop = () => {
            if (timerRef.current !== null) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };

        const markLeaving = () => {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

            if (!token || !navigator.sendBeacon) {
                return;
            }

            const body = new FormData();
            body.append('_token', token);

            navigator.sendBeacon(route('session.ping'), body);
        };

        timerRef.current = window.setInterval(ping, PING_INTERVAL_MS);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', markLeaving);

        function onVisibilityChange() {
            if (document.visibilityState === 'visible') {
                ping();
            }
        }

        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', markLeaving);
        };
    }, [enabled]);
}
