import { type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { classificationLabel, classificationVariant, statusLabel } from '@/lib/laporan-masuk-utils';
import { type TicketItem } from '@/types/laporan-selesai';
import { Link, usePage } from '@inertiajs/react';
import { CheckCircle2, Flag, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LaporanSelesaiTicketListProps {
    tickets: PaginatedData<TicketItem>;
    isLoading: boolean;
    routePrefix: string;
}

function getTicketDisplayTitle(ticket: TicketItem): string {
    if (ticket.title && ticket.title.trim().length > 0) {
        return ticket.title;
    }
    if (ticket.content && ticket.content.trim().length > 0) {
        const content = ticket.content.trim();
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    }
    return ticket.ticket_number;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
        return 'Kemarin';
    }
    if (diffDays < 7) {
        return `${diffDays} hari lalu`;
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function FlagButton({ ticket, routePrefix }: { ticket: TicketItem; routePrefix: string }) {
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
            // Unflag directly
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            setProcessing(true);
            try {
                const res = await fetch(route(`${routePrefix}.laporan-selesai.tandai`, ticket.ticket_number), {
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
            const res = await fetch(route(`${routePrefix}.laporan-selesai.tandai`, ticket.ticket_number), {
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
        <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
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

export function LaporanSelesaiTicketList({ tickets, isLoading, routePrefix }: LaporanSelesaiTicketListProps) {
    return (
        <div className={`divide-y transition-opacity duration-200 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => (
                    <div key={ticket.id} className="group hover:bg-muted/50 transition-colors">
                        <div className="flex gap-3 px-4 py-3">
                            <Link
                                href={route(`${routePrefix}.laporan-selesai.show`, { ticketNumber: ticket.ticket_number })}
                                className="min-w-0 flex-1"
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="text-foreground truncate text-sm font-medium">{getTicketDisplayTitle(ticket)}</span>
                                    <span className="text-muted-foreground shrink-0 text-xs">{formatDate(ticket.created_at)}</span>
                                </div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                                    <span className="text-foreground font-medium">{ticket.ticket_number}</span>
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
                                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600">
                                        <CheckCircle2 className="size-3" />
                                        {statusLabel(ticket.status)}
                                    </Badge>
                                    <span className="text-muted-foreground text-[10px]">{ticket.channel}</span>
                                </div>
                            </Link>
                            <div className="flex shrink-0 items-start pt-1">
                                <FlagButton ticket={ticket} routePrefix={routePrefix} />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
