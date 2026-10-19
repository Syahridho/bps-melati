import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
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
import { router, usePage } from '@inertiajs/react';
import { Calendar, Clock, Eye, FileText, Globe, Image as ImageIcon, Layers, LoaderCircle, Mail, Paperclip, Pencil, Phone, ShieldAlert, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AutoCloseCountdown } from './auto-close-countdown';

interface LaporanMasukDetailCardProps {
    ticket: TicketDetail;
    ticketStatus: Status;
    canEdit: boolean;
    canDelete: boolean;
    routePrefix?: string;
    serverNow: string;
    onEdit: () => void;
    onDelete: () => void;
    onPreviewAttachment: (attachment: Attachment, list: Attachment[]) => void;
}

export function LaporanMasukDetailCard({
    ticket,
    ticketStatus,
    canEdit,
    canDelete,
    routePrefix = 'dashboard.admin',
    serverNow,
    onEdit,
    onDelete,
    onPreviewAttachment,
}: LaporanMasukDetailCardProps) {
    const pageProps = usePage<{
        autoCloseDays?: {
            pengaduan?: number;
            aspirasi?: number;
            permintaan_informasi?: number;
            berkadar_pengawasan?: number;
        };
    }>().props;

    const autoCloseDays = pageProps.autoCloseDays;
    const isCompleted = ticketStatus === 'selesai';

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingValue, setPendingValue] = useState<boolean>(ticket.is_berkadar_pengawasan);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSwitchChange = (checked: boolean) => {
        if (isCompleted) return;
        setPendingValue(checked);
        setShowConfirmModal(true);
    };

    const handleConfirmToggle = () => {
        setIsSubmitting(true);
        const routeName = `${routePrefix}.laporan-masuk.berkadar-pengawasan.update`;

        router.patch(
            route(routeName, { ticketNumber: ticket.ticket_number }),
            {
                enabled: pendingValue,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setShowConfirmModal(false);
                    setIsSubmitting(false);
                    toast.success(
                        pendingValue ? 'Tiket ditandai Berkadar Pengawasan' : 'Penanda Berkadar Pengawasan dihapus',
                        {
                            description: 'Batas waktu auto-close diperbarui.',
                            position: 'bottom-right',
                        },
                    );
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    const firstError = Object.values(errs)[0];
                    toast.error('Gagal memperbarui penanda', {
                        description: typeof firstError === 'string' ? firstError : 'Terjadi kesalahan.',
                        position: 'bottom-right',
                    });
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const classificationDays =
        autoCloseDays?.[ticket.classification] ??
        (ticket.classification === 'pengaduan' ? 3 : ticket.classification === 'aspirasi' ? 1 : 5);
    const berkadarDays = autoCloseDays?.berkadar_pengawasan ?? 30;

    return (
        <div className="bg-card rounded-lg border">
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                        <Badge variant={classificationVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                        <Badge variant={statusVariant(ticketStatus)}>{statusLabel(ticketStatus)}</Badge>
                        {ticket.is_berkadar_pengawasan && (
                            <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Eye className="size-3" />
                                Berkadar Pengawasan
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                            <Clock className="size-3.5" />
                            <span>Diterima {formatFullDate(ticket.created_at)}</span>
                        </div>
                        <AutoCloseCountdown autoCloseAt={ticket.auto_close_at} serverNow={serverNow} ticketStatus={ticketStatus} />
                    </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                    <div className="flex items-center space-x-3">
                        <Switch
                            id="berkadar_pengawasan_switch"
                            checked={ticket.is_berkadar_pengawasan}
                            disabled={isCompleted}
                            onCheckedChange={handleSwitchChange}
                            aria-label="Berkadar Pengawasan"
                        />
                        <Label htmlFor="berkadar_pengawasan_switch" className="cursor-pointer text-sm font-medium flex items-center gap-1.5">
                            <ShieldAlert className="size-4 text-amber-500" />
                            Berkadar Pengawasan
                        </Label>
                    </div>
                    <p className="text-muted-foreground text-xs text-left sm:text-right">
                        Selesai otomatis setelah {berkadarDays} hari tanpa balasan pelapor.
                    </p>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">
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

            <AlertDialog open={showConfirmModal} onOpenChange={(open) => !isSubmitting && setShowConfirmModal(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingValue ? 'Tandai sebagai Berkadar Pengawasan?' : 'Hapus penanda Berkadar Pengawasan?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingValue
                                ? `Tiket ini akan diberi penanda Berkadar Pengawasan dan batas auto-close berubah menjadi ${berkadarDays} hari tanpa balasan pelapor.`
                                : `Batas auto-close akan kembali mengikuti jenis tiket (${classificationDays} hari).`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSubmitting}
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmToggle();
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : pendingValue ? (
                                'Ya, Tandai'
                            ) : (
                                'Ya, Hapus Penanda'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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

            <Separator />

            <div className="space-y-4 px-6 py-5">
                {ticket.title && (
                    <div>
                        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Judul Laporan</h3>
                        <p className="text-foreground mt-1 text-base font-semibold">{ticket.title}</p>
                    </div>
                )}
                <div>
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Isi Laporan</h3>
                    <div className="bg-muted/40 text-foreground mt-2 rounded-lg p-4 text-sm whitespace-pre-wrap">{ticket.content}</div>
                </div>

                {ticket.attachments && ticket.attachments.length > 0 && (
                    <div>
                        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                            Lampiran ({ticket.attachments.length})
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {ticket.attachments.map((att) => (
                                <div key={att.id} className="bg-muted/20 flex items-center justify-between rounded-lg border p-3 text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        {isImageMime(att.mime_type, att.original_name) ? (
                                            <ImageIcon className="size-4 shrink-0 text-blue-500" />
                                        ) : isPdfMime(att.mime_type, att.original_name) ? (
                                            <FileText className="size-4 shrink-0 text-red-500" />
                                        ) : (
                                            <Paperclip className="text-muted-foreground size-4 shrink-0" />
                                        )}
                                        <div className="truncate">
                                            <p className="truncate font-medium">{att.original_name}</p>
                                            <p className="text-muted-foreground text-[10px]">{formatFileSize(att.size)}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 shrink-0"
                                        onClick={() => onPreviewAttachment(att, ticket.attachments)}
                                    >
                                        <Paperclip className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
