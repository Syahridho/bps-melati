import { type PresenceMember, type TicketBroadcastEvent, type TicketResponseItem, type TypingSignal } from '@/types/laporan-masuk';
import { router } from '@inertiajs/react';
import { useConnectionStatus, useEchoPresence } from '@laravel/echo-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 60_000;
const POLL_INTERVAL_MS = 30000;
const BOTTOM_THRESHOLD_PX = 160;

export interface EmailStatusEvent {
    response_id: number;
    email_status: string;
    email_sent_at?: string | null;
    email_failed_at?: string | null;
    email_error?: string | null;
}

function isEmailStatusEvent(event: TicketBroadcastEvent | EmailStatusEvent): event is EmailStatusEvent {
    return 'response_id' in event && 'email_status' in event;
}

export interface UseTicketRealtimeOptions {
    ticketId: number;
    currentUserId: number;
    initialVersion: number;
    /** Nama pengguna yang tampil di indikator "sedang mengetik". */
    currentUserName: string;
    onResponse: (response: TicketResponseItem) => void;
    onEmailStatusUpdate?: (event: EmailStatusEvent) => void;
    onStatusChange: (status: TicketBroadcastEvent['status'], version: number) => void;
    onCompleted?: () => void;
}

export interface UseTicketRealtimeResult {
    viewers: PresenceMember[];
    typingNames: string[];
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
    onEmailStatusUpdate,
    onStatusChange,
    onCompleted,
}: UseTicketRealtimeOptions): UseTicketRealtimeResult {
    const connection = useConnectionStatus();
    const [viewers, setViewers] = useState<PresenceMember[]>([]);
    const [typingNames, setTypingNames] = useState<string[]>([]);
    const [version, setVersion] = useState(initialVersion);

    // Callback disimpan di ref agar event Echo tidak perlu re-subscribe tiap render.
    const handlers = useRef({ onResponse, onEmailStatusUpdate, onStatusChange, onCompleted });
    handlers.current = { onResponse, onEmailStatusUpdate, onStatusChange, onCompleted };

    // Satu balasan di-broadcast dua kali di kanal presence: `.ticket.updated`
    // dan `.ticket.response.created` membawa response yang sama. Efek samping
    // (toast, scroll otomatis, sorotan) harus jalan sekali saja per balasan.
    const seenResponseIds = useRef(new Set<number>());

    const { channel } = useEchoPresence<TicketBroadcastEvent | EmailStatusEvent>(
        `ticket.${ticketId}`,
        ['.ticket.response.created', '.ticket.updated', '.ticket.response.email-status-updated'],
        (event) => {
            if (isEmailStatusEvent(event)) {
                handlers.current.onEmailStatusUpdate?.(event);
                return;
            }

            const eventVersion = typeof event.version === 'number' ? event.version : 0;

            setVersion((prev) => Math.max(prev, eventVersion));
            handlers.current.onStatusChange(event.status, eventVersion);

            if (event.status === 'selesai') {
                handlers.current.onCompleted?.();
            }

            const response = 'response' in event ? event.response : null;

            if (!response) {
                return;
            }

            const responseId = response.id;

            if (seenResponseIds.current.has(responseId)) {
                return;
            }

            // Batas aman untuk satu sesi; jangan biarkan membengkak pada tab yang lama terbuka.
            if (seenResponseIds.current.size >= 500) {
                seenResponseIds.current.clear();
            }

            seenResponseIds.current.add(responseId);

            const shouldScroll = isNearBottom();
            handlers.current.onResponse(response);

            if (shouldScroll) {
                window.setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 60);
            }

            if (event.actor_id !== null && event.actor_id !== currentUserId) {
                toast.info(`${response.user_name} membalas`, {
                    description: response.message.slice(0, 120),
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

        const handleTyping = (signal: TypingSignal) => {
            // abaikan whisper dari diri sendiri
            if (signal.user_id === currentUserId) return;

            setTypingNames((prev) => {
                // hapus entri lama user ini jika ada, lalu tambahkan baru
                const idx = prev.indexOf(signal.name);
                if (idx >= 0) prev.splice(idx, 1);
                // tambahkan jika belum ada dan belum melebihati batas
                if (!prev.includes(signal.name) && prev.length < 20) {
                    prev.push(signal.name);
                }
                return prev;
            });
        };

        active.listenForWhisper('typing', handleTyping);

        // timer pembersih: hapus nama yang tidak aktif selama 60 detik
        const cleanupTimer = window.setInterval(() => {
            setTypingNames((prev) => {
                // hapus nama yang kadaluarsa (tidak ada event typing baru 60 detik)
                // catatan: signal.at menandai waktu terakhir aktif
                // untuk kesederhanaan, kita hanya hapus jika ada di dalam prev
                // dan kita butuhkan logika yang lebih canggih di level berikutnya
                return prev; // placeholder: semua nama tetap sampai timeout individual
            });
        }, 60_000);

        return () => {
            window.clearInterval(cleanupTimer);
            active.stopListeningForWhisper('typing');
        };
    }, [channel, currentUserId, typingNames]);

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

    return { viewers, typingNames, connection, broadcastTyping, version };
}
