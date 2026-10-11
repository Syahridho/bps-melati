import { type InboxChangedEvent, type InboxUpdatedEvent } from '@/types/laporan-masuk';
import { router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const RELOAD_DEBOUNCE_MS = 500;

/**
 * Realtime untuk halaman daftar Laporan Masuk.
 *
 * Event dari private channel `inbox.laporan-masuk` dipakai untuk:
 *  - menandai baris yang barusan dibalas ("dibalas oleh X"),
 *  - memperbarui badge hitungan pada tab filter,
 *  - memicu reload parsial `tickets` + `counts` dengan debounce 500 ms supaya
 *    server tidak dibanjiri saat banyak petugas mengirim balasan bersamaan.
 *
 * Reload sengaja dilewati ketika pengguna sedang mengetik di kolom pencarian.
 */
export function useInboxRealtime({ searching }: { searching: boolean }) {
    const [recentlyAnswered, setRecentlyAnswered] = useState<Record<number, string>>({});
    const searchingRef = useRef(searching);
    searchingRef.current = searching;

    const debounceRef = useRef<number | null>(null);

    const scheduleReload = useCallback(() => {
        if (searchingRef.current) {
            return;
        }

        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            router.reload({ only: ['tickets', 'counts', 'inbox_open_count'] });
        }, RELOAD_DEBOUNCE_MS);
    }, []);

    useEcho<InboxUpdatedEvent>(
        'inbox.laporan-masuk',
        '.inbox.updated',
        (event) => {
            if (event.actor_id !== null && event.status !== 'selesai') {
                setRecentlyAnswered((prev) => ({ ...prev, [event.ticket_id]: event.actor_name ?? 'Petugas' }));
            }

            scheduleReload();
        },
        [],
    );

    // Sinyal agregat (mis. satu batch auto close): cukup memicu reload yang
    // sama, jadi baris yang hilang dan angka badge/tab ikut turun.
    useEcho<InboxChangedEvent>(
        'inbox.laporan-masuk',
        '.inbox.changed',
        () => {
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

    const clearRecentlyAnswered = useCallback((ticketId: number) => {
        setRecentlyAnswered((prev) => {
            if (!(ticketId in prev)) {
                return prev;
            }

            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
    }, []);

    return { recentlyAnswered, clearRecentlyAnswered };
}
