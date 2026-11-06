import type { TicketListEntry } from '@/components/shared/ticket-list/types';
import { type InboxTicketItem } from '@/types/laporan-masuk';

export function toTicketListEntry(
    ticket: InboxTicketItem,
    routePrefix: string,
    recentlyAnswered: Record<number, string> = {},
): TicketListEntry {
    const title =
        ticket.title && ticket.title.trim().length > 0
            ? ticket.title
            : ticket.content && ticket.content.trim().length > 0
              ? ticket.content.trim().length > 60
                  ? ticket.content.trim().slice(0, 60) + '...'
                  : ticket.content.trim()
              : ticket.ticket_number;

    return {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        display_title: title,
        content: ticket.content,
        classification: ticket.classification,
        status: ticket.status,
        channel: ticket.channel,
        created_at: ticket.created_at,
        reporter_name: ticket.reporter_name,
        show_href: route(`${routePrefix}.laporan-masuk.show`, { ticketNumber: ticket.ticket_number }),
        is_flagged: ticket.is_flagged,
        flag_note: ticket.flag_note,
        flagged_by_name: ticket.flagged_by_name,
        tandai_route: route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number),
        is_read: ticket.is_read,
        is_pengawasan: ticket.is_pengawasan,
        recently_answered_by: recentlyAnswered[ticket.id] ?? null,
    };
}

export { mapLaporanMasukToDetailData } from '@/components/shared/ticket-detail/adapters';

