import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    classificationLabel,
    classificationVariant,
    formatFullDate,
    statusLabel,
    statusVariant,
} from '@/lib/laporan-masuk-utils';
import { type Attachment, type Status, type TicketDetail } from '@/types/laporan-masuk';
import { Calendar, Clock, FileText, Globe, Layers, Mail, Pencil, Phone, ShieldAlert, TimerOff, Trash2, User } from 'lucide-react';

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
            <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                        <Badge variant={classificationVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                        <Badge variant={statusVariant(ticketStatus)}>{statusLabel(ticketStatus)}</Badge>
                        {ticket.is_pengawasan && (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                Pengawasan
                            </Badge>
                        )}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Clock className="size-3.5" />
                        <span>Diterima {formatFullDate(ticket.created_at)}</span>
                    </div>
                    {ticket.auto_close_at && (
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <TimerOff className="size-3.5 shrink-0" />
                            <span>Akan ditutup otomatis pada {formatFullDate(ticket.auto_close_at)} bila pelapor tidak membalas.</span>
                        </div>
                    )}
                    {ticket.is_pengawasan && ticket.pengawasan_at && (
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                            <span>Aktif sejak {formatFullDate(ticket.pengawasan_at)} oleh {ticket.pengawasan_by_name ?? 'Petugas'} - auto close {ticket.kadar_pengawasan_days} hari</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3 bg-muted/50 border rounded-lg px-3 py-2">
                        <div className="flex flex-col text-right">
                            <span className="text-xs font-medium flex items-center gap-1 justify-end">
                                <ShieldAlert className="size-3.5 text-amber-500" />
                                Kadar Pengawasan
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {ticket.is_pengawasan ? `Auto close ${ticket.kadar_pengawasan_days} hari` : `Auto close default (${ticket.classification_default_days}h)`}
                            </span>
                        </div>
                        <Switch
                            checked={ticket.is_pengawasan}
                            disabled={ticketStatus === 'selesai' || processingPengawasan}
                            onCheckedChange={onTogglePengawasan ? (checked) => onTogglePengawasan(checked) : undefined}
                        />
                    </div>

                    <div className="flex items-center gap-2">
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

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-md p-2">
                        <User className="text-muted-foreground size-4" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Pelapor</p>
                        <p className="text-sm font-medium">{ticket.reporter_name ?? 'Anonim'}</p>
                    </div>
                </div>
                {ticket.reporter_email && (
                    <div className="flex items-start gap-3">
                        <div className="bg-muted rounded-md p-2">
                            <Mail className="text-muted-foreground size-4" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Email</p>
                            <p className="text-sm font-medium">{ticket.reporter_email}</p>
                        </div>
                    </div>
                )}
                {ticket.reporter_wa && (
                    <div className="flex items-start gap-3">
                        <div className="bg-muted rounded-md p-2">
                            <Phone className="text-muted-foreground size-4" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">WhatsApp</p>
                            <p className="text-sm font-medium">{ticket.reporter_wa}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-md p-2">
                        <Globe className="text-muted-foreground size-4" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Sumber / Aplikasi</p>
                        <p className="text-sm font-medium capitalize">{ticket.source_app}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-md p-2">
                        <Layers className="text-muted-foreground size-4" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Channel</p>
                        <p className="text-sm font-medium">{ticket.channel}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-md p-2">
                        <Calendar className="text-muted-foreground size-4" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Periode</p>
                        <p className="text-sm font-medium">{ticket.period}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-md p-2">
                        <FileText className="text-muted-foreground size-4" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Nomor Urut</p>
                        <p className="text-sm font-medium">{ticket.sequence}</p>
                    </div>
                </div>
                {ticket.created_by_name && (
                    <div className="flex items-start gap-3">
                        <div className="bg-muted rounded-md p-2">
                            <User className="text-muted-foreground size-4" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Dibuat Oleh</p>
                            <p className="text-sm font-medium">{ticket.created_by_name}</p>
                        </div>
                    </div>
                )}
            </div>

            {ticket.attachments.length > 0 && (
                <>
                    <Separator />
                    <div className="px-6 py-4">
                        <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">Lampiran ({ticket.attachments.length})</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {ticket.attachments.map((att) => (
                                <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => onPreviewAttachment(att, ticket.attachments)}
                                    className="bg-muted/40 hover:bg-muted/80 flex items-center gap-3 rounded-md border p-2.5 text-left transition-colors"
                                >
                                    <div className="bg-background rounded p-1.5 shadow-xs">
                                        <Paperclip className="text-muted-foreground size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">{att.original_name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
