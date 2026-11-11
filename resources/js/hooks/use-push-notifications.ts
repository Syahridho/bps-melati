'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied';

export interface PushSubscriptionState {
    endpoint: string;
    p256dh: string | null;
    auth: string | null;
}

interface UsePushNotificationsReturn {
    status: PushStatus;
    isSubscribed: boolean;
    isLoading: boolean;
    vapidPublicKey: string | null;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    toggle: (checked: boolean) => Promise<void>;
}

/** Ambil CSRF token dari meta tag yang di-render oleh Blade (@csrf). */
function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

/** Header standar untuk request push subscription (JSON via sesi web). */
function jsonHeaders(includeCsrf = false): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    };
    if (includeCsrf) {
        (headers as Record<string, string>)['X-CSRF-TOKEN'] = getCsrfToken();
    }
    return headers;
}

/** Konversi Uint8Array ke base64url (untuk menyimpan di state). */
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Deteksi apakah browser mendukung Web Push. */
function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [status, setStatus] = useState<PushStatus>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
    const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
    const syncInFlightRef = useRef<boolean>(false);

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? null;

    /**
     * Kirim subscription ke server (POST /push-subscriptions).
     */
    const syncSubscriptionToServer = useCallback(
        async (subscription: PushSubscription): Promise<void> => {
            // Hindari request ganda: jika sudah ada sinkronisasi berjalan, lewati.
            if (syncInFlightRef.current) return;
            syncInFlightRef.current = true;

            try {
                const p256dhKey = subscription.getKey('p256dh');
                const authKey = subscription.getKey('auth');
                const p256dh = p256dhKey ? uint8ArrayToBase64Url(new Uint8Array(p256dhKey)) : null;
                const auth = authKey ? uint8ArrayToBase64Url(new Uint8Array(authKey)) : null;

                const body = {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh,
                        auth,
                    },
                };

                const res = await fetch(route('push-subscriptions.store'), {
                    method: 'POST',
                    headers: jsonHeaders(true),
                    credentials: 'same-origin',
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    throw new Error('Gagal menyimpan subscription ke server.');
                }
            } finally {
                syncInFlightRef.current = false;
            }
        },
        [],
    );

    useEffect(() => {
        if (!isPushSupported()) {
            setStatus('unsupported');
            return;
        }

        setVapidPublicKey(vapidKey);

        const initPush = async () => {
            const permission = Notification.permission;

            if (permission === 'denied') {
                setStatus('denied');
                return;
            }

            if (permission === 'granted') {
                setStatus('granted');

                try {
                    const registration = await navigator.serviceWorker.ready;
                    swRegistrationRef.current = registration;

                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        setIsSubscribed(true);
                        // Sinkronkan ulang ke server setelah halaman dimuat (pulihkan yang hilang).
                        await syncSubscriptionToServer(subscription);
                    }
                } catch {
                    // Biarkan diam; switch akan ditangani saat enable().
                }
            } else {
                setStatus('default');
            }
        };

        // Daftarkan service worker di scope '/' (berkas public/sw.js).
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then(() => {
                initPush();
            })
            .catch(() => {
                // SW gagal didaftarkan; treat sebagai unsupported.
                setStatus('unsupported');
            });
    }, [vapidKey, syncSubscriptionToServer]);

    const enable = useCallback(async (): Promise<void> => {
        if (!vapidKey || isLoading) return;

        setIsLoading(true);

        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setStatus('denied');
                toast('Notifikasi push tidak diaktifkan', {
                    description: 'Izin notifikasi ditolak oleh browser.',
                });
                return;
            }

            setStatus('granted');

            const registration = await navigator.serviceWorker.ready;
            swRegistrationRef.current = registration;

            // Kirim VAPID key ke SW untuk dipakai saat pushsubscriptionchange.
            registration.active?.postMessage({
                type: 'SET_VAPID_PUBLIC_KEY',
                key: vapidKey,
            });

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            setIsSubscribed(true);

            await syncSubscriptionToServer(subscription);

            toast('Notifikasi push diaktifkan', {
                description: 'Anda akan menerima notifikasi saat Melati ditutup.',
            });
        } catch (err) {
            setStatus('default');
            setIsSubscribed(false);
            toast('Gagal mengaktifkan push', {
                description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [vapidKey, isLoading, syncSubscriptionToServer]);

    const disable = useCallback(async (): Promise<void> => {
        if (!swRegistrationRef.current) {
            swRegistrationRef.current = await navigator.serviceWorker.ready;
        }

        const registration = swRegistrationRef.current;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            // Hapus dari server.
            await fetch(route('push-subscriptions.destroy'), {
                method: 'DELETE',
                headers: jsonHeaders(true),
                credentials: 'same-origin',
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
        }

        setIsSubscribed(false);
        setStatus(Notification.permission === 'denied' ? 'denied' : 'default');

        toast('Notifikasi push dinonaktifkan', {
            description: 'Anda tidak akan menerima notifikasi saat Melati ditutup.',
        });
    }, []);

    const toggle = useCallback(
        async (checked: boolean): Promise<void> => {
            if (checked) {
                await enable();
            } else {
                await disable();
            }
        },
        [enable, disable],
    );

    return {
        status,
        isSubscribed,
        isLoading,
        vapidPublicKey,
        enable,
        disable,
        toggle,
    };
}

/** Konversi base64url VAPID key ke Uint8Array untuk PushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String) {
        return new Uint8Array(0);
    }

    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}
