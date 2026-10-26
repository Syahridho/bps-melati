import { type ReporterReplyEvent } from '@/types/laporan-masuk';
import { router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

const TOAST_DURATION_MS = 8000;
const MAX_SEEN_IDS = 200;

/**
 * Toast real-time saat pelapor membalas tiket.
 *
 * Dipasang SEKALI di layout dashboard (`app-sidebar-layout.tsx`) supaya toast
 * muncul di halaman mana pun: dashboard, daftar laporan, maupun detail tiket.
 *
 * Event diterima dari kanal privat per pengguna `App.Models.User.{id}` —
 * server sudah menyaring penerima sesuai role dan asal tiket, jadi hook ini
 * tidak perlu tahu aturan akses. Bila petugas sedang membuka tiket yang sama,
 * `ticket` juga di-reload parsial agar balasan langsung tampil tanpa refresh.
 */
export function useReporterReplyToast(userId: number | null) {
    const page = usePage();
    const pageRef = useRef(page);
    pageRef.current = page;

    // Dedupe berlapis: id toast sonner + Set lokal, untuk berjaga-jaga bila
    // event yang sama terkirim ulang (mis. reconnect Reverb).
    const seenReplyIds = useRef<Set<number>>(new Set());

    const handleReply = useCallback((event: ReporterReplyEvent) => {
        if (seenReplyIds.current.has(event.reply_id)) {
            return;
        }

        if (seenReplyIds.current.size >= MAX_SEEN_IDS) {
            seenReplyIds.current.clear();
        }
        seenReplyIds.current.add(event.reply_id);

        const currentPage = pageRef.current;

        // Bangun URL sesuai role penerima: backend mengirim `url` versi admin
        // sebagai fallback, sedangkan operator memakai prefix dashboard.operator.
        const role = (currentPage.props as { auth?: { user?: { role?: string } } }).auth?.user?.role;
        const routePrefix = role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
        const routeName = event.is_input_data ? `${routePrefix}.input-data.show` : `${routePrefix}.laporan-masuk.show`;

        let targetUrl = event.url;
        try {
            targetUrl = route(routeName, event.ticket_number);
        } catch {
            // Rute tidak tersedia (mis. role tidak berhak) — tetap pakai url server.
        }

        // Jangan hanya toast bila tiket yang sama sedang dibuka: segarkan isi
        // detailnya (show.tsx menyinkronkan state `responses` dari prop ticket).
        const openTicketId = (currentPage.props as { ticket?: { id?: number } }).ticket?.id;
        if (openTicketId === event.ticket_id) {
            router.reload({ only: ['ticket'] });
        }

        // ${event.excerpt}${event.has_attachment ? ' · 📎 Lampiran' : ''}
        toast('Balasan baru dari pelapor', {
            id: `reply-${event.reply_id}`,
            description: `#${event.ticket_number}S`,
            duration: TOAST_DURATION_MS,
            action: {
                label: 'Lihat',
                onClick: () => router.visit(targetUrl),
            },
        });
    }, []);

    useEcho<ReporterReplyEvent>(
        userId ? `App.Models.User.${userId}` : '',
        '.ticket.reply.from.reporter',
        (event) => {
            if (userId) {
                handleReply(event);
            }
        },
        [userId, handleReply],
    );
}
