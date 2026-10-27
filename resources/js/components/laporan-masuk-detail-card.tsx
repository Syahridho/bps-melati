import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    classificationLabel,
    classificationVariant,
    formatFileSize,
    formatFullDate,
    isImageMime,
    isPdfMime,
    statusLabel,
    statusVariant,
} from '@/lib/laporan-masuk-utils';
import { type Attachment, type Status, type TicketDetail } from '@/types/laporan-masuk';
import {
    Calendar,
    Clock,
    Download,
    FileText,
    Globe,
    ImageIcon,
    Layers,
    Mail,
    Paperclip,
    Pencil,
    Phone,
    ShieldAlert,
    TimerOff,
    Trash2,
    User,
} from 'lucide-react';

interface LaporanMasukDetailCardProps {
    ticket: TicketDetail;
    ticketStatus: Status;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onPreviewAttachment: (attachment: Attachment, list: Attachment[]) => void;
    onTogglePengawasan?: (aktif: boolean) => void;
    processingPengawasan?: boolean;
}

export function LaporanMasukDetailCard({
    ticket,
    ticketStatus,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    onPreviewAttachment,
    onTogglePengawasan,
    processingPengawasan = false,
}: LaporanMasukDetailCardProps) {
    return (
        <div className="bg-card rounded-lg border">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 text-xl font-bold [overflow-wrap:anywhere] break-words">{ticket.ticket_number}</h2>
                        <Badge variant={classificationVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                        <Badge variant={statusVariant(ticketStatus)}>{statusLabel(ticketStatus)}</Badge>
                        {ticket.is_pengawasan && (
                            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Pengawasan
                            </Badge>
                        )}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Clock className="size-3.5 shrink-0" />
                        <span>Diterima {formatFullDate(ticket.created_at)}</span>
                    </div>
                    {ticket.auto_close_at && (
                        <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                            <TimerOff className="mt-0.5 size-3.5 shrink-0" />
                            <span>Akan ditutup otomatis pada {formatFullDate(ticket.auto_close_at)} bila pelapor tidak membalas.</span>
                        </div>
                    )}
                    {ticket.is_pengawasan && ticket.pengawasan_at && (
                        <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                            <span>
                                Aktif sejak {formatFullDate(ticket.pengawasan_at)} oleh {ticket.pengawasan_by_name ?? 'Petugas'} - auto close{' '}
                                {ticket.kadar_pengawasan_days} hari
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
                    <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:w-auto">
                        <div className="flex min-w-0 flex-col text-left sm:text-right">
                            <span className="flex items-center gap-1 text-xs font-medium sm:justify-end">
                                <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                                Kadar Pengawasan
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                                {ticket.is_pengawasan
                                    ? `Auto close ${ticket.kadar_pengawasan_days} hari`
                                    : `Auto close default (${ticket.classification_default_days}h)`}
                            </span>
                        </div>
                        <Switch
                            checked={ticket.is_pengawasan}
                            disabled={ticketStatus === 'selesai' || processingPengawasan}
                            onCheckedChange={onTogglePengawasan ? (checked) => onTogglePengawasan(checked) : undefined}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                            <Button variant="outline" size="sm" onClick={onEdit}>
                                <Pencil className="mr-1.5 size-4" />
                                Edit
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={onDelete}
                            >
                                <Trash2 className="mr-1.5 size-4" />
                                Hapus
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid gap-x-4 gap-y-5 px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5 xl:grid-cols-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-muted shrink-0 rounded-md p-2">
                        <User className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Pelapor</p>
                        <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.reporter_name ?? 'Anonim'}</p>
                    </div>
                </div>
                {ticket.reporter_email && (
                    <div className="flex min-w-0 items-start gap-3 min-[1280px]:max-[1399px]:col-span-2">
                        <div className="bg-muted shrink-0 rounded-md p-2">
                            <Mail className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Email</p>
                            <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.reporter_email}</p>
                        </div>
                    </div>
                )}
                {ticket.reporter_wa && (
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="bg-muted shrink-0 rounded-md p-2">
                            <Phone className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">WhatsApp</p>
                            <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.reporter_wa}</p>
                        </div>
                    </div>
                )}
                <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-muted shrink-0 rounded-md p-2">
                        <Globe className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Sumber / Aplikasi</p>
                        <p className="text-sm font-medium [overflow-wrap:anywhere] break-words capitalize">{ticket.source_app}</p>
                    </div>
                </div>
                <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-muted shrink-0 rounded-md p-2">
                        <Layers className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Channel</p>
                        <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.channel}</p>
                    </div>
                </div>
                <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-muted shrink-0 rounded-md p-2">
                        <Calendar className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Tanggal Dibuat</p>
                        <p className="text-sm font-medium break-words">{formatFullDate(ticket.created_at)}</p>
                    </div>
                </div>
                <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-muted shrink-0 rounded-md p-2">
                        <FileText className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Nomor Urut</p>
                        <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.sequence}</p>
                    </div>
                </div>
                {ticket.created_by_name && (
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="bg-muted shrink-0 rounded-md p-2">
                            <User className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Dibuat Oleh</p>
                            <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{ticket.created_by_name}</p>
                        </div>
                    </div>
                )}
            </div>

            {ticket.attachments.length > 0 && (
                <>
                    <Separator />
                    <div className="px-4 py-4 sm:px-6">
                        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                            Lampiran ({ticket.attachments.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {ticket.attachments.map((att) => (
                                <div
                                    key={att.id}
                                    className="bg-muted/40 hover:bg-muted/80 flex items-center gap-2 rounded-md border p-2.5 transition-colors"
                                >
                                    <button
                                        type="button"
                                        onClick={() => onPreviewAttachment(att, ticket.attachments)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        <div className="bg-background shrink-0 rounded p-1.5 shadow-xs">
                                            {isImageMime(att.mime_type, att.original_name) ? (
                                                <ImageIcon className="size-4 text-blue-500" />
                                            ) : isPdfMime(att.mime_type, att.original_name) ? (
                                                <FileText className="size-4 text-red-500" />
                                            ) : (
                                                <Paperclip className="text-muted-foreground size-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">{att.original_name}</p>
                                            {att.size ? <p className="text-muted-foreground text-[10px]">{formatFileSize(att.size)}</p> : null}
                                        </div>
                                    </button>
                                    <a
                                        href={att.url}
                                        download
                                        aria-label={`Unduh ${att.original_name}`}
                                        title="Unduh lampiran"
                                        className="text-muted-foreground hover:text-foreground hover:bg-background shrink-0 rounded p-1.5 transition-colors"
                                    >
                                        <Download className="size-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
