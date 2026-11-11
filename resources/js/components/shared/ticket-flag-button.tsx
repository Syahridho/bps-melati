import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePage } from '@inertiajs/react';
import { Flag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface GenericFlagTicket {
    ticket_number: string;
    is_flagged?: boolean;
    flag_note?: string | null;
    flagged_by_name?: string | null;
}

interface TicketFlagButtonProps {
    ticket: GenericFlagTicket;
    tandaiRoute: string;
    onFlagChange?: (isFlagged: boolean, note: string | null) => void;
    variant?: 'icon' | 'badge-button';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function TicketFlagButton({
    ticket,
    tandaiRoute,
    onFlagChange,
    variant = 'icon',
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: TicketFlagButtonProps) {
    const [flagged, setFlagged] = useState(ticket.is_flagged ?? false);
    const [note, setNote] = useState('');
    const [flagNote, setFlagNote] = useState(ticket.flag_note ?? '');
    const [flaggedByName, setFlaggedByName] = useState(ticket.flagged_by_name ?? '');
    const [internalOpen, setInternalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setFlagged(ticket.is_flagged ?? false);
        setFlagNote(ticket.flag_note ?? '');
        setFlaggedByName(ticket.flagged_by_name ?? '');
    }, [ticket.is_flagged, ticket.flag_note, ticket.flagged_by_name]);
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setNote('');
        }
        if (isControlled) {
            setControlledOpen?.(nextOpen);
        } else {
            setInternalOpen(nextOpen);
        }
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (flagged) {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            setProcessing(true);
            try {
                const res = await fetch(tandaiRoute, {
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
                onFlagChange?.(false, null);
            } catch {
                setFlagged(true);
                setFlagNote(ticket.flag_note ?? '');
                setFlaggedByName(ticket.flagged_by_name ?? '');
                toast.error('Gagal melepas tandai');
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleFlag = async () => {
        const submittedNote = note;
        setFlagged(true);
        setFlagNote(submittedNote);
        setFlaggedByName(auth.user.name);
        handleOpenChange(false);
        setProcessing(true);

        try {
            const res = await fetch(tandaiRoute, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ aktif: true, note: submittedNote || null }),
            });
            if (!res.ok) throw new Error();
            toast.success('Laporan berhasil ditandai');
            onFlagChange?.(true, submittedNote || null);
        } catch {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            toast.error('Gagal menandai laporan');
        } finally {
            setProcessing(false);
        }
    };

    if (variant === 'badge-button') {
        return (
            <div className="flex items-center gap-2">
                {flagged && (
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <Flag className="mr-1 size-3 fill-orange-500" />
                                    Ditandai
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                                <p className="text-xs">
                                    Ditandai oleh {flaggedByName || 'Petugas'}
                                    {flagNote && <span className="text-muted-foreground mt-1 block">"{flagNote}"</span>}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                {flagged ? (
                    <Button variant="secondary" size="sm" onClick={handleToggle} disabled={processing} aria-label="Lepas tandai">
                        <Flag className="mr-1.5 size-4 fill-orange-500 text-orange-500" />
                        Lepas Tandai
                    </Button>
                ) : (
                    <Popover open={open} onOpenChange={handleOpenChange}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" disabled={processing} aria-label="Tandai laporan">
                                <Flag className="mr-1.5 size-4" />
                                Tandai
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
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
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
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

    if (flagged) {
        return (
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={handleToggle}
                            disabled={processing}
                            className="flex size-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-orange-500/10 focus-visible:outline-none"
                            aria-label="Lepas tandai"
                        >
                            <Flag className="size-3.5 fill-orange-500 text-orange-500" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-xs">
                            Ditandai oleh {flaggedByName || 'Petugas'}
                            {flagNote ? `: "${flagNote}"` : ''} · Klik untuk lepas
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                disabled={processing}
                                className="text-muted-foreground/40 hover:text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded focus-visible:outline-none"
                                aria-label="Tandai laporan"
                            >
                                <Flag className="size-3.5" />
                            </button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-xs">Tandai laporan ini</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <PopoverContent
                className="w-72"
                align="start"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChange(false);
                            }}
                        >
                            Batal
                        </Button>
                        <Button size="sm" onClick={handleFlag} disabled={processing}>
                            Tandai
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
