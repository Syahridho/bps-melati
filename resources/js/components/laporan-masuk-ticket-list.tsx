import { type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { classificationLabel, classificationVariant, formatDate, statusLabel } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type InboxTicketItem } from '@/types/laporan-masuk';
import { Link, usePage } from '@inertiajs/react';
import { CheckCircle2, Flag, Inbox, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LaporanMasukTicketListProps {
    tickets: PaginatedData<InboxTicketItem>;
    isLoading: boolean;
    routePrefix: string;
    recentlyAnswered: Record<number, string>;
    onSelectTicket: (ticketId: number) => void;
}

function getTicketDisplayTitle(ticket: InboxTicketItem): string {
    if (ticket.title && ticket.title.trim().length > 0) {
        return ticket.title;
    }
    if (ticket.content && ticket.content.trim().length > 0) {
        const content = ticket.content.trim();
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    }
    return ticket.ticket_number;
}

function FlagButton({ ticket, routePrefix }: { ticket: InboxTicketItem; routePrefix: string }) {
    const [flagged, setFlagged] = useState(ticket.is_flagged ?? false);
    const [note, setNote] = useState(ticket.flag_note ?? '');
    const [flagNote, setFlagNote] = useState(ticket.flag_note ?? '');
    const [flaggedByName, setFlaggedByName] = useState(ticket.flagged_by_name ?? '');
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (flagged) {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            setProcessing(true);
            try {
                const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ aktif: false }),
                });
                if (!res.ok) throw new Error();
                toast.success('Tandai berhasil dilepas');
            } catch {
                setFlagged(true);
                setFlagNote(ticket.flag_note ?? '');
                setFlaggedByName(ticket.flagged_by_name ?? '');
                toast.error('Gagal melepas tandai');
            } finally {
                setProcessing(false);
            }
        } else {
            setOpen(true);
        }
    };

    const handleFlag = async () => {
        setFlagged(true);
        setFlagNote(note);
        setFlaggedByName(auth.user.name);
        setOpen(false);
        setProcessing(true);
        try {
            const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ aktif: true, note: note || null }),
            });
            if (!res.ok) throw new Error();
            toast.success('Laporan berhasil ditandai');
        } catch {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            toast.error('Gagal menandai laporan');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            {flagged && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                Ditandai
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                                Ditandai oleh {flaggedByName || 'Petugas'}
                                {flagNote && <span className="block mt-1 text-muted-foreground">"{flagNote}"</span>}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {flagged ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={handleToggle}
                    disabled={processing}
                    aria-label="Lepas tandai"
                >
                    <Flag className="size-4 fill-orange-500 text-orange-500" />
                </Button>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
                            disabled={processing}
                            aria-label="Tandai laporan"
                        >
                            <Flag className="size-4 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="end" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Tandai Laporan</p>
                            <Textarea
                                placeholder="Catatan alasan (opsional, maks 255 karakter)"
                                maxLength={255}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="min-h-[60px] text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                                    Batal
                                </Button>
                                <Button size="sm" onClick={handleFlag} disabled={processing}>
                                    Tandai
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

export function LaporanMasukTicketList({ tickets, isLoading, routePrefix, recentlyAnswered, onSelectTicket }: LaporanMasukTicketListProps) {
    return (
        <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Inbox className="mb-3 size-10" />
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => (
                    <div key={ticket.id} className={cn('group hover:bg-muted/50 transition-colors', !ticket.is_read && 'bg-primary/[0.03]')}>
                        <div className="flex gap-3 px-4 py-3">
                            <Link
                                href={route(`${routePrefix}.laporan-masuk.show`, { ticketNumber: ticket.ticket_number })}
                                className="min-w-0 flex-1"
                                onClick={() => onSelectTicket(ticket.id)}
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span
                                        className={cn(
                                            'truncate text-sm',
                                            !ticket.is_read ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                                        )}
                                    >
                                        {getTicketDisplayTitle(ticket)}
                                    </span>
                                    <span className="text-muted-foreground shrink-0 text-xs">{formatDate(ticket.created_at)}</span>
                                </div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                                    {!ticket.is_read && <span className="inline-block size-2 shrink-0 rounded-full bg-blue-500" />}
                                    <span className={cn('text-foreground font-medium')}>{ticket.ticket_number}</span>
                                    {ticket.reporter_name && (
                                        <>
                                            <span>•</span>
                                            <span>{ticket.reporter_name}</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-muted-foreground mb-2 truncate text-xs">{ticket.content}</p>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant={classificationVariant(ticket.classification)} className="text-[10px]">
                                        {classificationLabel(ticket.classification)}
                                    </Badge>
                                    {ticket.is_pengawasan && (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                                        >
                                            <ShieldAlert className="size-3" />
                                            Pengawasan
                                        </Badge>
                                    )}
                                    {ticket.status === 'selesai' ? (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600"
                                        >
                                            <CheckCircle2 className="size-3" />
                                            Selesai
                                        </Badge>
                                    ) : ticket.status !== 'baru' ? (
                                        <Badge variant="outline" className="text-[10px]">
                                            {statusLabel(ticket.status)}
                                        </Badge>
                                    ) : null}
                                    <span className="text-muted-foreground text-[10px]">{ticket.channel}</span>
                                    <FlagButton ticket={ticket} routePrefix={routePrefix} />
                                    {recentlyAnswered[ticket.id] && (
                                        <Badge variant="outline" className="text-[10px]">
                                            dibalas oleh {recentlyAnswered[ticket.id]}
                                        </Badge>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
