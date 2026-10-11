import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { classificationBadgeClass, statusBadge } from '@/lib/dashboard-constants';
import { classificationLabel, formatDate } from '@/lib/dashboard-utils';
import { cn } from '@/lib/utils';
import { type TicketSummary } from '@/types/dashboard';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

interface DashboardRecentTicketsProps {
    recentTickets: TicketSummary[];
    periodLabel: string;
    allTicketsRoute: string;
    ticketDetailRouteName: string;
}

export function DashboardRecentTickets({ recentTickets, periodLabel, allTicketsRoute, ticketDetailRouteName }: DashboardRecentTicketsProps) {
    function renderClassificationBadge(classification: TicketSummary['classification']) {
        return (
            <Badge className={cn('px-1.5 py-0 text-[10px]', classificationBadgeClass(classification))}>{classificationLabel(classification)}</Badge>
        );
    }

    return (
        <Card className="min-w-0 overflow-hidden border shadow-xs">
            <CardHeader className="flex flex-col items-start gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-base font-bold">Laporan Terbaru Masuk</CardTitle>
                    <CardDescription className="text-xs">Daftar 7 laporan atau konsultasi terbaru pada periode: {periodLabel}</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs font-medium">
                    <Link href={allTicketsRoute}>
                        Lihat Semua
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {recentTickets.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-xs">Belum ada laporan pada periode ini.</div>
                ) : (
                    <>
                        {/* Mobile: daftar kartu */}
                        <div className="divide-y md:hidden">
                            {recentTickets.map((ticket) => {
                                const sBadge = statusBadge(ticket.status);
                                return (
                                    <div key={ticket.id} className="space-y-2 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link
                                                href={route(ticketDetailRouteName, {
                                                    ticketNumber: ticket.ticket_number,
                                                })}
                                                className="text-primary font-mono text-xs font-medium break-all hover:underline"
                                            >
                                                {ticket.ticket_number}
                                            </Link>
                                            <span
                                                className={cn(
                                                    'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                    sBadge.className,
                                                )}
                                            >
                                                {sBadge.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {renderClassificationBadge(ticket.classification)}
                                            <span className="text-muted-foreground text-xs">{ticket.channel}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="font-medium">{ticket.reporter_name || 'Anonim'}</span>
                                            <span className="text-muted-foreground">{formatDate(ticket.created_at)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: tabel */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[180px]">Kode Tiket</TableHead>
                                        <TableHead>Pelapor</TableHead>
                                        <TableHead>Klasifikasi</TableHead>
                                        <TableHead>Saluran</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Waktu Masuk</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTickets.map((ticket) => {
                                        const sBadge = statusBadge(ticket.status);
                                        return (
                                            <TableRow key={ticket.id}>
                                                <TableCell className="font-mono text-xs font-medium">
                                                    <Link
                                                        href={route(ticketDetailRouteName, {
                                                            ticketNumber: ticket.ticket_number,
                                                        })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {ticket.ticket_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">{ticket.reporter_name || 'Anonim'}</TableCell>
                                                <TableCell>{renderClassificationBadge(ticket.classification)}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{ticket.channel}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                            sBadge.className,
                                                        )}
                                                    >
                                                        {sBadge.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-right text-xs">
                                                    {formatDate(ticket.created_at)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
