import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTicketDate } from '@/lib/welcome-utils';
import { type StoredTicket } from '@/types/welcome';
import { Link } from '@inertiajs/react';
import { Clock, Ticket, X } from 'lucide-react';

interface TicketHistoryCardProps {
    ticketHistory: StoredTicket[];
    onSelectToDelete: (ticket: StoredTicket) => void;
}

export function TicketHistoryCard({ ticketHistory, onSelectToDelete }: TicketHistoryCardProps) {
    if (ticketHistory.length === 0) {
        return null;
    }

    return (
        <Card className="mx-auto mt-8 max-w-2xl shadow-xs">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Ticket className="text-muted-foreground size-5" />
                    Riwayat laporan Anda
                </CardTitle>
                <CardDescription>Tersimpan di perangkat ini.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y border-t">
                    {[...ticketHistory].reverse().map((ticket) => (
                        <div
                            key={`${ticket.ticket_number}-${ticket.created_at}`}
                            className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6"
                        >
                            <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold break-all">{ticket.ticket_number}</p>
                                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                                    <Clock className="size-3 shrink-0" />
                                    <span>{formatTicketDate(ticket.created_at)}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={route('tickets.check', { ticket_number: ticket.ticket_number })}>Cek status</Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8"
                                    title="Hapus dari riwayat"
                                    onClick={() => onSelectToDelete(ticket)}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
