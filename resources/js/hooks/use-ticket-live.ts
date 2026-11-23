import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import type { ShowProps, Status, TicketResponseItem } from '@/types/incoming-reports';

const EMAIL_POLL_INTERVAL = 4000;
const EMAIL_POLL_MAX = 2 * 60 * 1000;

interface Options {
    ticket: ShowProps['ticket'];
    user: { id: number; name: string };
    showReplyForm: boolean;
    onCompleted: () => void;
}

export function useTicketLive({ ticket, user, showReplyForm, onCompleted }: Options) {
    const [responses, setResponses] = useState<TicketResponseItem[]>(ticket.responses);
    const [status, setStatus] = useState<Status>(ticket.status);
    const [completedAt, setCompletedAt] = useState<string | null>(ticket.completed_at ?? null);
    const [rating, setRating] = useState<number | null>(ticket.rating ?? null);
    const [version, setVersion] = useState<number>(ticket.version ?? 0);
    const [highlightLast, setHighlightLast] = useState(false);
    const [pendingNotice, setPendingNotice] = useState<string | null>(null);

    // sinkron dengan props dari server
    useEffect(() => {
        setResponses(ticket.responses);
        setStatus(ticket.status);
        setCompletedAt(ticket.completed_at ?? null);
        setRating(ticket.rating ?? null);
        setVersion(ticket.version ?? 0);
    }, [ticket]);

    // polling selama ada email berstatus pending (maks 2 menit)
    const hasPendingEmail = responses.some((r) => r.email_status === 'pending');
    useEffect(() => {
        if (!hasPendingEmail) return;

        const startedAt = Date.now();
        const interval = setInterval(() => {
            if (Date.now() - startedAt >= EMAIL_POLL_MAX) {
                clearInterval(interval);
                return;
            }
            router.reload({ only: ['ticket'] });
        }, EMAIL_POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [hasPendingEmail]);

    // catat jumlah balasan saat form dibuka, untuk notifikasi balasan baru
    const responseCountRef = useRef(responses.length);
    responseCountRef.current = responses.length;
    const responsesAtFormOpen = useRef(responses.length);

    useEffect(() => {
        if (showReplyForm) {
            responsesAtFormOpen.current = responseCountRef.current;
            setPendingNotice(null);
        }
    }, [showReplyForm]);

    // scroll ke balasan terakhir
    const lastItemRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (highlightLast) lastItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [highlightLast, responses.length]);

    const handleIncomingResponse = useCallback((response: TicketResponseItem) => {
        setResponses((prev) => (prev.some((r) => r.id === response.id) ? prev : [...prev, response]));

        setHighlightLast(true);
        window.setTimeout(() => setHighlightLast(false), 2000);

        setPendingNotice((current) =>
            responsesAtFormOpen.current >= responseCountRef.current ? current : `Ada balasan baru dari ${response.user_name}.`,
        );
    }, []);

    const realtime = useTicketRealtime({
        ticketId: ticket.id,
        currentUserId: user.id,
        currentUserName: user.name,
        initialVersion: version,
        onResponse: handleIncomingResponse,
        onEmailStatusUpdate: (event) => {
            setResponses((prev) =>
                prev.map((r) =>
                    r.id === event.response_id
                        ? {
                              ...r,
                              email_status: event.email_status as TicketResponseItem['email_status'],
                              email_sent_at: event.email_sent_at ?? null,
                              email_failed_at: event.email_failed_at ?? null,
                              email_error: event.email_error ?? null,
                          }
                        : r,
                ),
            );
        },
        onStatusChange: (nextStatus, nextVersion) => {
            setStatus(nextStatus);
            setVersion((prev) => Math.max(prev, nextVersion));
        },
        onCompleted: (eventCompletedAt, eventRating) => {
            setCompletedAt(eventCompletedAt ?? new Date().toISOString());
            setRating(eventRating ?? null);
            setPendingNotice(null);
            onCompleted();
        },
    });

    return {
        responses,
        status,
        completedAt,
        rating,
        pendingNotice,
        lastItemRef,
        viewers: realtime.viewers,
        typingNames: realtime.typingNames,
        broadcastTyping: realtime.broadcastTyping,
        liveVersion: realtime.version,
    };
}
