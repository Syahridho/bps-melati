import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    Globe,
    Image as ImageIcon,
    Layers,
    Mail,
    MessageSquare,
    Paperclip,
    Phone,
    User,
} from 'lucide-react';
import { useState } from 'react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

interface Attachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

interface TicketResponseItem {
    id: number;
    type: 'respon_awal' | 'respon_substantif';
    message: string;
    user_name: string;
    sent_at: string | null;
    created_at: string;
    attachments: Attachment[];
}

interface TicketDetail {
    id: number;
    ticket_number: string;
    period: string;
    sequence: number;
    classification: Classification;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_by_name: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    attachments: Attachment[];
    responses: TicketResponseItem[];
}

interface ShowProps {
    ticket: TicketDetail;
}

function classificationLabel(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
    }
}

function classificationVariant(classification: Classification): 'default' | 'secondary' | 'destructive' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

function responseTypeLabel(type: string): string {
    switch (type) {
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        default:
            return type;
    }
}

function responseTypeVariant(type: string): 'default' | 'secondary' {
    return type === 'respon_awal' ? 'secondary' : 'default';
}

function statusLabel(status: Status): string {
    switch (status) {
        case 'baru':
            return 'Baru';
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        case 'selesai':
            return 'Selesai';
    }
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageMime(mimeType: string, fileName: string): boolean {
    return mimeType?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(fileName);
}

function isPdfMime(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

export default function Show({ ticket }: ShowProps) {
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan selesai"
            breadcrumbs={[
                { title: 'Laporan Selesai', href: route('dashboard.admin.laporan-selesai.index') },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
                {/* Back button */}
                <div className="flex items-center justify-between">
                    <Link
                        href={route('dashboard.admin.laporan-selesai.index')}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke Laporan Selesai
                    </Link>
                </div>

                {/* Main card */}
                <div className="rounded-lg border bg-card">
                    {/* Header */}
                    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                                <Badge variant={classificationVariant(ticket.classification)}>
                                    {classificationLabel(ticket.classification)}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        ticket.status === 'respon_substantif'
                                            ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                                            : 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400',
                                    )}
                                >
                                    <CheckCircle2 className="mr-1 size-3" />
                                    {statusLabel(ticket.status)}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock className="size-3.5" />
                                    Diterima {formatFullDate(ticket.created_at)}
                                </span>
                                {ticket.completed_at && (
                                    <span className={cn(
                                        'inline-flex items-center gap-1.5',
                                        ticket.status === 'respon_substantif'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-amber-600 dark:text-amber-400',
                                    )}>
                                        <CheckCircle2 className="size-3.5" />
                                        {statusLabel(ticket.status)} {formatFullDate(ticket.completed_at)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Info pelapor & meta */}
                    <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <User className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pelapor</p>
                                <p className="text-sm font-medium">{ticket.reporter_name ?? 'Anonim'}</p>
                            </div>
                        </div>
                        {ticket.reporter_email && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Mail className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm font-medium">{ticket.reporter_email}</p>
                                </div>
                            </div>
                        )}
                        {ticket.reporter_wa && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Phone className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                                    <p className="text-sm font-medium">{ticket.reporter_wa}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Globe className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sumber</p>
                                <p className="text-sm font-medium capitalize">{ticket.source_app}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Layers className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Channel</p>
                                <p className="text-sm font-medium">{ticket.channel}</p>
                            </div>
                        </div>
                        {ticket.satuan_tugas && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Layers className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Satuan Tugas</p>
                                    <p className="text-sm font-medium">{ticket.satuan_tugas}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Calendar className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Periode</p>
                                <p className="text-sm font-medium">{ticket.period}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <MessageSquare className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Nomor Urut</p>
                                <p className="text-sm font-medium">#{ticket.sequence}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Isi laporan */}
                    <div className="px-6 py-5">
                        <h3 className="mb-3 text-sm font-semibold">Isi Laporan</h3>
                        <div className="prose prose-sm max-w-none rounded-lg bg-muted/50 p-4 dark:prose-invert">
                            <p className="whitespace-pre-wrap leading-relaxed">{ticket.content}</p>
                        </div>
                    </div>

                    {/* Lampiran tiket */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <>
                            <Separator />
                            <div className="px-6 py-5">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <Paperclip className="size-4" />
                                    Lampiran ({ticket.attachments.length})
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {ticket.attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="shrink-0 rounded-md bg-muted p-2">
                                                    {isImageMime(attachment.mime_type, attachment.original_name) ? (
                                                        <ImageIcon className="size-4 text-blue-500" />
                                                    ) : (
                                                        <FileText className="size-4 text-red-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{attachment.original_name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPreviewAttachment(attachment)}
                                                title="Lihat Lampiran"
                                                className="shrink-0"
                                            >
                                                <Eye className="mr-1.5 size-4" />
                                                Lihat
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Riwayat Respon */}
                    {ticket.responses && ticket.responses.length > 0 && (
                        <>
                            <Separator />
                            <div className="px-6 py-5">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                                    <MessageSquare className="size-4" />
                                    Riwayat Respon ({ticket.responses.length})
                                </h3>
                                <div className="space-y-4">
                                    {ticket.responses.map((resp) => (
                                        <div key={resp.id} className="rounded-lg border bg-muted/30 p-4">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={responseTypeVariant(resp.type)} className="text-[10px]">
                                                        {responseTypeLabel(resp.type)}
                                                    </Badge>
                                                    <span className="text-xs font-medium text-foreground">{resp.user_name}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatFullDate(resp.sent_at ?? resp.created_at)}
                                                </span>
                                            </div>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{resp.message}</p>

                                            {/* Response attachments */}
                                            {resp.attachments && resp.attachments.length > 0 && (
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                    {resp.attachments.map((att) => (
                                                        <div
                                                            key={att.id}
                                                            className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                {isImageMime(att.mime_type, att.original_name) ? (
                                                                    <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                                                ) : (
                                                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                                )}
                                                                <span className="truncate font-medium">{att.original_name}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0"
                                                                onClick={() => setPreviewAttachment(att)}
                                                                title="Lihat Lampiran"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dialog Preview Lampiran */}
            <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
                <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate">{previewAttachment?.original_name}</DialogTitle>
                        <DialogDescription>{previewAttachment && formatFileSize(previewAttachment.size)}</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-auto">
                        {previewAttachment && isImageMime(previewAttachment.mime_type, previewAttachment.original_name) && (
                            <img
                                src={previewAttachment.url}
                                alt={previewAttachment.original_name}
                                className="mx-auto max-h-[65vh] rounded-md object-contain"
                            />
                        )}

                        {previewAttachment && isPdfMime(previewAttachment.mime_type, previewAttachment.original_name) && (
                            <iframe
                                src={previewAttachment.url}
                                title={previewAttachment.original_name}
                                className="h-[65vh] w-full rounded-md border-0"
                            />
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                        <a
                            href={previewAttachment?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-muted-foreground hover:underline"
                        >
                            Buka di tab baru
                        </a>
                        <Button onClick={() => setPreviewAttachment(null)} className="w-full sm:w-auto">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
