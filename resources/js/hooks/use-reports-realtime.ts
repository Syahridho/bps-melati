import { router, usePage } from '@inertiajs/react';
import { useConnectionStatus, useEcho } from '@laravel/echo-react';
import { useCallback, useEffect, useRef } from 'react';

const RELOAD_DEBOUNCE_MS = 500;

/**
 * Realtime untuk halaman daftar laporan (Input Data, Laporan Masuk, Laporan Selesai).
 *
 * Event `.laporan.changed` dari channel `laporan.admin` (admin) atau
 * `laporan.operator.{userId}` (operator) memicu reload parsial `tickets` +
 * `counts` dengan debounce agar server tidak dibanjiri saat banyak event
 * beruntun (mis. satu batch import sosial media).
 *
 * Payload tidak memuat data sensitif: klien selalu mengambil data lengkap
 * lewat Inertia sehingga otorisasi server tetap berlaku.
 *
 * Reload ditunda (bukan dibuang) saat:
 *  - pengguna sedang mengetik di kolom pencarian (`searching` = true), atau
 *  - dialog/popover sedang terbuka (`isBusy` = true).
 * Setelah interaksi selesai, reload yang tertunda dijalankan sekali.
 *
 * Filter, pencarian, tab aktif, `page`, `per_page`, dan posisi scroll tidak
 * ter-reset karena reload memakai preserveState + preserveScroll.
 *
 * Bila koneksi WebSocket putus lalu pulih, satu reload dijalankan supaya
 * perubahan yang terlewat selama offline ikut masuk.
 */
export interface UseLaporanRealtimeOptions {
    /** Jika true, reload akan ditunda (misal popover flag sedang terbuka). */
    isBusy?: boolean;
    /** Jika true, pengguna sedang mengetik di kolom pencarian. */
    searching?: boolean;
    /** Props tambahan yang ingin di-reload (default: ['tickets', 'counts']). */
    only?: string[];
    /** Callback opsional saat event `created` dari pengguna lain diterima. */
    onCreated?: (event: LaporanChangedEvent) => void;
}

export interface LaporanChangedEvent {
    action:
        | 'created'
        | 'updated'
        | 'deleted'
        | 'flagged'
        | 'unflagged'
        | 'pengawasan_activated'
        | 'pengawasan_deactivated'
        | 'completed'
        | 'status_changed';
    id: number;
    ticket_number: string;
    type: string;
    status: string | null;
    actor_id: number | null;
    occurred_at: string | null;
    is_input_data?: boolean;
    channel_name?: string | null;
}

export interface UseLaporanRealtimeResult {
    /** True selama kanal Reverb terhubung. */
    isLive: boolean;
}

export function useLaporanRealtime({
    isBusy = false,
    searching = false,
    only = ['tickets', 'counts'],
    onCreated,
}: UseLaporanRealtimeOptions = {}): UseLaporanRealtimeResult {
    const { auth } = usePage<{ auth: { user: { id: number; role: string } } }>().props;
    const userId = auth?.user?.id ?? null;
    const role = auth?.user?.role ?? null;

    const debounceRef = useRef<number | null>(null);
    const pendingRef = useRef(false);

    const searchingRef = useRef(searching);
    searchingRef.current = searching;

    const isBusyRef = useRef(isBusy);
    isBusyRef.current = isBusy;

    // `only` sering berupa array literal baru tiap render; simpan di ref agar
    // listener Echo tidak perlu di-subscribe ulang.
    const onlyRef = useRef(only);
    onlyRef.current = only;

    const onCreatedRef = useRef(onCreated);
    onCreatedRef.current = onCreated;

    const scheduleReload = useCallback(() => {
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null;

            // Jangan acak urutan daftar saat pengguna sedang mengetik atau
            // berinteraksi dengan popover; tunda sampai selesai.
            if (searchingRef.current || isBusyRef.current) {
                pendingRef.current = true;
                return;
            }

            pendingRef.current = false;
            // router.reload selalu mempertahankan state & posisi scroll, jadi
            // filter, tab, page, dan per_page yang sedang aktif tidak ter-reset.
            router.reload({ only: onlyRef.current });
        }, RELOAD_DEBOUNCE_MS);
    }, []);

    // Jalankan reload yang tertunda setelah pengguna berhenti mencari / menutup popover.
    useEffect(() => {
        if (searching || isBusy || !pendingRef.current) {
            return;
        }

        scheduleReload();
    }, [searching, isBusy, scheduleReload]);

    // Tentukan channel berdasarkan role.
    const channelName = role === 'admin' ? 'laporan.admin' : role && userId ? `laporan.operator.${userId}` : '';

    useEcho<LaporanChangedEvent>(
        channelName,
        '.laporan.changed',
        (event) => {
            // Abaikan event yang dipicu oleh diri sendiri untuk menghindari
            // reload ganda setelah update optimistik di tab yang sama.
            if (event.actor_id !== null && event.actor_id === userId) {
                return;
            }

            if (event.action === 'created') {
                onCreatedRef.current?.(event);
            }

            scheduleReload();
        },
        [],
    );

    const connectionStatus = useConnectionStatus();
    const hasConnectedRef = useRef(false);
    const previousStatusRef = useRef(connectionStatus);

    useEffect(() => {
        const previousStatus = previousStatusRef.current;
        previousStatusRef.current = connectionStatus;

        if (connectionStatus !== 'connected') {
            return;
        }

        // Koneksi pertama bukan reconnect: halaman baru memuat data dari server.
        if (!hasConnectedRef.current) {
            hasConnectedRef.current = true;

            return;
        }

        // Koneksi pulih: satu reload untuk mengejar perubahan selama offline.
        if (previousStatus !== 'connected') {
            scheduleReload();
        }
    }, [connectionStatus, scheduleReload]);

    useEffect(() => {
        return () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return { isLive: connectionStatus === 'connected' };
}
