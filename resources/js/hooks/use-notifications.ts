'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string | null;
    ticket_number: string | null;
    url: string | null;
    actor_name: string | null;
    read_at: string | null;
    created_at: string;
}

interface UseNotificationsReturn {
    notifications: NotificationItem[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    cursor: string | null;
    hasMore: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAsUnread: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    loadNotifications: (append?: boolean) => Promise<void>;
    loadUnreadCount: () => Promise<void>;
}

/** Normalisasi payload broadcast dan respons API menjadi bentuk yang sama. */
function normalizeNotification(n: Record<string, unknown>): NotificationItem {
    return {
        id: String(n.id),
        type: String(n.type),
        title: String(n.title),
        message: n.message ? String(n.message) : null,
        ticket_number: n.ticket_number ? String(n.ticket_number) : null,
        url: n.url ? String(n.url) : null,
        actor_name: n.actor_name ? String(n.actor_name) : null,
        read_at: n.read_at ? String(n.read_at) : null,
        created_at: String(n.created_at),
    };
}

/** Ambil CSRF token dari meta tag yang di-render oleh Blade (@csrf). */
function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

/** Header standar untuk semua request notifikasi (JSON via sesi web). */
function jsonHeaders(includeCsrf = false): HeadersInit {
    const headers: HeadersInit = {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    };
    if (includeCsrf) {
        (headers as Record<string, string>)['X-CSRF-TOKEN'] = getCsrfToken();
    }
    return headers;
}

export function useNotifications(
    userId: number | null,
    initialUnreadCount: number = 0,
): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const loadingMoreRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Handler tunggal untuk notifikasi realtime dari private channel user.
     * Dipicu baik untuk menambah item ke daftar maupun menampilkan toast —
     * satu sumber kebenaran, tidak ada dua listener terpisah.
     */
    const handleRealtimeNotification = useCallback(
        (event: Record<string, unknown>) => {
            const item = normalizeNotification(event);

            // Dedup berdasarkan id (hindari item dobel jika event sama diterima berkali-kali).
            setNotifications((prev) => {
                if (prev.some((n) => n.id === item.id)) return prev;
                return [item, ...prev];
            });

            setUnreadCount((prev) => prev + 1);

            // Tampilkan toast satu kali per notifikasi.
            toast('Notifikasi baru', {
                description: item.title,
                id: `notification-${item.id}`,
                action: {
                    label: 'Lihat',
                    onClick: () => {
                        if (item.url) {
                            router.visit(item.url, { preserveScroll: true });
                        }
                    },
                },
            });
        },
        [],
    );

    // Subscribe sekali ke private channel per pengguna. Hidup selama layout aktif.
    useEcho<Record<string, unknown>>(
        userId ? `App.Models.User.${userId}` : '',
        '.notifications',
        handleRealtimeNotification,
        [userId],
    );

    const loadNotifications = useCallback(
        async (append = false): Promise<void> => {
            if (loadingMoreRef.current) return;
            if (!userId) return;

            // Batalkan request sebelumnya jika masih berjalan (hindari panggilan ganda).
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const params = new URLSearchParams({ per_page: '15' });
            if (cursor) params.set('cursor', cursor);

            loadingMoreRef.current = true;
            setError(null);
            if (!append) setLoading(true);

            try {
                const res = await fetch(`${route('notifications.index')}?${params}`, {
                    headers: jsonHeaders(false),
                    credentials: 'same-origin',
                    signal: controller.signal,
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 419) {
                        setError('Sesi telah kedaluwarsa. Silakan muat ulang halaman.');
                        return;
                    }
                    throw new Error('Gagal memuat notifikasi.');
                }

                const json = await res.json();
                if (!json.success) throw new Error('Gagal memuat notifikasi.');

                const items: NotificationItem[] = json.data.map((n: Record<string, unknown>) =>
                    normalizeNotification(n),
                );

                if (append) {
                    setNotifications((prev) => {
                        const next = [...prev, ...items];
                        const seen = new Set<string>();
                        return next.filter((n) => {
                            if (seen.has(n.id)) return false;
                            seen.add(n.id);
                            return true;
                        });
                    });
                } else {
                    setNotifications(items);
                }

                setHasMore(json.next_cursor !== null);
                setCursor(json.next_cursor ?? null);
                setError(null);
            } catch (e) {
                if ((e as DOMException).name === 'AbortError') return;
                setError(e instanceof Error ? e.message : 'Gagal memuat notifikasi.');
            } finally {
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
                setLoading(false);
                loadingMoreRef.current = false;
            }
        },
        [userId, cursor],
    );

    const loadUnreadCount = useCallback(async (): Promise<void> => {
        if (!userId) return;
        try {
            const res = await fetch(route('notifications.unread.count'), {
                headers: jsonHeaders(false),
                credentials: 'same-origin',
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.success) {
                setUnreadCount(json.unread_count ?? 0);
                setError(null);
            }
        } catch {
            // Biarkan diam — data tetap konsisten lewat Inertia reload.
        }
    }, [userId]);

    // Sinkronkan unreadCount dari server pada mount (Inertia props bisa usang).
    useEffect(() => {
        loadUnreadCount();
    }, [userId, loadUnreadCount]);

    const markAsRead = useCallback(
        async (id: string): Promise<void> => {
            if (!userId) return;

            const prevNotifications = [...notifications];
            const prevUnread = unreadCount;

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
            );
            setUnreadCount((prev) => Math.max(prev - 1, 0));
            setError(null);

            try {
                const res = await fetch(route('notifications.read', { id }), {
                    method: 'PATCH',
                    headers: jsonHeaders(true),
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 419) {
                        setError('Sesi telah kedaluwarsa. Silakan muat ulang halaman.');
                        setNotifications(prevNotifications);
                        setUnreadCount(prevUnread);
                        return;
                    }
                    throw new Error('Gagal menandai dibaca.');
                }

                const json = await res.json();
                if (!json.success) throw new Error('Gagal menandai dibaca.');
            } catch {
                // Rollback
                setNotifications(prevNotifications);
                setUnreadCount(prevUnread);
            }
        },
        [userId, notifications, unreadCount],
    );

    const markAsUnread = useCallback(
        async (id: string): Promise<void> => {
            if (!userId) return;

            const prevNotifications = [...notifications];
            const prevUnread = unreadCount;

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: null } : n)),
            );
            setUnreadCount((prev) => prev + 1);
            setError(null);

            try {
                const res = await fetch(route('notifications.unread', { id }), {
                    method: 'PATCH',
                    headers: jsonHeaders(true),
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 419) {
                        setError('Sesi telah kedaluwarsa. Silakan muat ulang halaman.');
                        setNotifications(prevNotifications);
                        setUnreadCount(prevUnread);
                        return;
                    }
                    throw new Error('Gagal menandai belum dibaca.');
                }

                const json = await res.json();
                if (!json.success) throw new Error('Gagal menandai belum dibaca.');
            } catch {
                setNotifications(prevNotifications);
                setUnreadCount(prevUnread);
            }
        },
        [userId, notifications, unreadCount],
    );

    const markAllAsRead = useCallback(async (): Promise<void> => {
        if (!userId) return;

        const prevNotifications = [...notifications];

        setNotifications((prev) =>
            prev.map((n) => ({ ...n, read_at: new Date().toISOString() })),
        );
        setUnreadCount(0);
        setError(null);

        try {
            const res = await fetch(route('notifications.read-all'), {
                method: 'PATCH',
                headers: jsonHeaders(true),
                credentials: 'same-origin',
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 419) {
                    setError('Sesi telah kedaluwarsa. Silakan muat ulang halaman.');
                    setNotifications(prevNotifications);
                    return;
                }
                throw new Error('Gagal menandai semua dibaca.');
            }

            const json = await res.json();
            if (!json.success) throw new Error('Gagal menandai semua dibaca.');
        } catch {
            setNotifications(prevNotifications);
            await loadUnreadCount();
        }
    }, [userId, notifications, loadUnreadCount]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        cursor,
        hasMore,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        loadNotifications,
        loadUnreadCount,
    };
}
