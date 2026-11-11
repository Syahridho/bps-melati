import { router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useCallback, useEffect, useRef } from 'react';

const RELOAD_DEBOUNCE_MS = 750;

/**
 * Realtime untuk halaman daftar laporan (Input Data, Laporan Masuk, Laporan Selesai).
 *
 * Event `.laporan.changed` dari channel `laporan.admin` (admin) atau
 * `laporan.operator.{userId}` (operator) memicu reload parsial `tickets` +
 * `counts` dengan debounce agar server tidak dibanjiri saat banyak event
 * beruntun.
 *
 * Payload tidak memuat data sensitif: klien selalu mengambil data lengkap
 * lewat Inertia sehingga otorisasi server tetap berlaku.
 *
 * Reload dilewati saat:
 *  - pengguna sedang mengetik di kolom pencarian (`searching` = true), atau
 *  - dialog/popover sedang terbuka (`isBusy` = true), atau
 *  - request Inertia sedang berjalan.
 *
 * Filter, pencarian, tab aktif, dan halaman pagination yang sedang dibuka
 * tidak ter-reset karena pakai preserveState + preserveScroll.
 */
export interface UseLaporanRealtimeOptions {
    /** Jika true, reload akan dilewati (misal popover flag sedang terbuka). */
    isBusy?: boolean;
    /** Jika true, pengguna sedang mengetik di kolom pencarian. */
    searching?: boolean;
    /** Props tambahan yang ingin di-reload (default: ['tickets', 'counts']). */
    only?: string[];
}

export interface LaporanChangedEvent {
    action: 'created' | 'updated' | 'deleted' | 'flagged' | 'unflagged' | 'pengawasan_activated' | 'pengawasan_deactivated';
    id: number;
    ticket_number: string;
    type: string;
    actor_id: number | null;
}

export function useLaporanRealtime({
    isBusy = false,
    searching = false,
    only = ['tickets', 'counts'],
}: UseLaporanRealtimeOptions = {}) {
    const { auth } = usePage<{ auth: { user: { id: number; role: string } } }>().props;
    const user = auth.user;

    const debounceRef = useRef<number | null>(null);
    const searchingRef = useRef(searching);
    searchingRef.current = searching;

    const isBusyRef = useRef(isBusy);
    isBusyRef.current = isBusy;

    const scheduleReload = useCallback(() => {
        if (searchingRef.current || isBusyRef.current) {
            return;
        }

        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            router.reload({
                only,
            });
        }, RELOAD_DEBOUNCE_MS);
    }, [only]);

    // Tentukan channel berdasarkan role.
    const channelName =
        user.role === 'admin'
            ? 'laporan.admin'
            : `laporan.operator.${user.id}`;

    const eventName = '.laporan.changed';

    useEcho<LaporanChangedEvent>(
        channelName,
        eventName,
        (event) => {
            // Abaikan event yang dipicu oleh diri sendiri (actor yang sama)
            // untuk menghindari reload ganda setelah update optimistik.
            if (event.actor_id !== null && event.actor_id === user.id) {
                return;
            }

            scheduleReload();
        },
        [],
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, []);
}
