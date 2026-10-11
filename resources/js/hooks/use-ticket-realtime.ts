import { type PresenceMember, type TicketBroadcastEvent, type TicketResponseItem, type TypingSignal } from '@/types/laporan-masuk';
import { router } from '@inertiajs/react';
import { useConnectionStatus, useEchoPresence } from '@laravel/echo-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 4000;
const POLL_INTERVAL_MS = 30000;
const BOTTOM_THRESHOLD_PX = 160;

export interface UseTicketRealtimeOptions {
    ticketId: number;
    currentUserId: number;
    initialVersion: number;
    /** Nama pengguna yang tampil di indikator "sedang mengetik". */
    currentUserName: string;
    onResponse: (response: TicketResponseItem) => void;
    onStatusChange: (status: TicketBroadcastEvent['status'], version: number) => void;
    onCompleted?: () => void;
}

export interface UseTicketRealtimeResult {
    viewers: PresenceMember[];
    typingName: string | null;
    connection: ReturnType<typeof useConnectionStatus>;
    broadcastTyping: () => void;
    /** Versi tiket terakhir yang diketahui frontend (dikirim sebagai expected_version). */
    version: number;
}

function isNearBottom(): boolean {
    const doc = document.documentElement;
    return doc.scrollHeight - doc.scrollTop - doc.clientHeight < BOTTOM_THRESHOLD_PX;
}

/**
 * Realtime untuk halaman detail tiket (Laporan Masuk / Input Data).
 *
 * - Presence channel `ticket.{id}`: daftar petugas yang sedang membuka tiket ini.
 * - `.ticket.response.created` & `.ticket.updated`: payload digabung karena bentuknya
 *   sama; `response` di-dedupe berdasarkan `id` sehingga tidak pernah tampil dua kali
 *   walau pengirim dan penerima kebetulan menerima event yang sama.
 * - Saat WebSocket putus lalu tersambung, halaman di-reload parsial agar riwayat
 *   yang terlewat tetap sinkron.
 * - Bila WebSocket tidak tersedia, polling 30 detik aktif HANYA saat koneksi
 *   terputus dan tab sedang terlihat. Balasan tetap aman karena proteksi ada di server.
 *
 * Indikator mengetik hanya informasi: tidak pernah mengunci tombol Balas.
 */
export function useTicketRealtime({
    ticketId,
    currentUserId,
    initialVersion,
    currentUserName,
    onResponse,
    onStatusChange,
    onCompleted,
}: UseTicketRealtimeOptions): UseTicketRealtimeResult {
    const connection = useConnectionStatus();
    const [viewers, setViewers] = useState<PresenceMember[]>([]);
    const [typingName, setTypingName] = useState<string | null>(null);
    const [version, setVersion] = useState(initialVersion);

    // Callback disimpan di ref agar event Echo tidak perlu re-subscribe tiap render.
    const handlers = useRef({ onResponse, onStatusChange, onCompleted });
    handlers.current = { onResponse, onStatusChange, onCompleted };

    // Satu balasan di-broadcast dua kali di kanal presence: `.ticket.updated`
    // dan `.ticket.response.created` membawa response yang sama. Efek samping
    // (toast, scroll otomatis, sorotan) harus jalan sekali saja per balasan.
    const seenResponseIds = useRef(new Set<number>());

    const { channel } = useEchoPresence<TicketBroadcastEvent>(
        `ticket.${ticketId}`,
        ['.ticket.response.created', '.ticket.updated'],
        (event) => {
            setVersion((prev) => Math.max(prev, event.version));
            handlers.current.onStatusChange(event.status, event.version);

            if (event.status === 'selesai') {
                handlers.current.onCompleted?.();
            }

            if (!event.response) {
                return;
            }

            const responseId = event.response.id;

            if (seenResponseIds.current.has(responseId)) {
                return;
            }

            // Batas aman untuk satu sesi; jangan biarkan membengkak pada tab yang lama terbuka.
            if (seenResponseIds.current.size >= 500) {
                seenResponseIds.current.clear();
            }

            seenResponseIds.current.add(responseId);

            const shouldScroll = isNearBottom();
            handlers.current.onResponse(event.response);

            if (shouldScroll) {
                window.setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 60);
            }

            if (event.actor_id !== null && event.actor_id !== currentUserId) {
                toast.info(`${event.response.user_name} membalas`, {
                    description: event.response.message.slice(0, 120),
                });
            }
        },
        [ticketId, currentUserId],
    );

    // Presence: siapa saja yang sedang membuka tiket ini.
    useEffect(() => {
        const active = channel();

        if (!active) {
            return;
        }

        active.here((members: PresenceMember[]) => setViewers(members));
        active.joining((member: PresenceMember) => {
            setViewers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
        });
        active.leaving((member: PresenceMember) => {
            setViewers((prev) => prev.filter((m) => m.id !== member.id));
        });
    }, [channel]);

    // Indikator "sedang mengetik" — informasi saja, tidak memblokir aksi siapa pun.
    useEffect(() => {
        const active = channel();

        if (!active) {
            return;
        }

        let idleTimer: number | null = null;

        active.listenForWhisper('typing', (signal: TypingSignal) => {
            if (signal.user_id === currentUserId) {
                return;
            }

            setTypingName(signal.name);

            if (idleTimer !== null) {
                window.clearTimeout(idleTimer);
            }
            idleTimer = window.setTimeout(() => setTypingName(null), TYPING_IDLE_MS);
        });

        return () => {
            if (idleTimer !== null) {
                window.clearTimeout(idleTimer);
            }
        };
    }, [channel, currentUserId]);

    const lastTypingAt = useRef(0);

    const broadcastTyping = useCallback(() => {
        const now = Date.now();

        if (now - lastTypingAt.current < TYPING_THROTTLE_MS) {
            return;
        }
        lastTypingAt.current = now;

        channel()?.whisper('typing', { user_id: currentUserId, name: currentUserName, at: now });
    }, [channel, currentUserId, currentUserName]);

    // Polling cadangan: hanya saat WebSocket terputus, dan hanya saat tab terlihat.
    const isOffline = connection === 'disconnected' || connection === 'failed';

    useEffect(() => {
        if (!isOffline) {
            return;
        }

        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['ticket'] });
            }
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [isOffline]);

    // Reconnect: begitu koneksi kembali hidup, sinkronkan riwayat yang terlewat
    // selama offline. Event realtime saja tidak cukup karena bisa terlewat.
    const wasOffline = useRef(isOffline);

    useEffect(() => {
        if (wasOffline.current && connection === 'connected') {
            router.reload({ only: ['ticket'] });
        }
        wasOffline.current = isOffline;
    }, [connection, isOffline]);

    return { viewers, typingName, connection, broadcastTyping, version };
}
