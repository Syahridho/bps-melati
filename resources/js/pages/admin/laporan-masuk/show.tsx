import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    Forward,
    Globe,
    Image as ImageIcon,
    Layers,
    LoaderCircle,
    Mail,
    MessageSquare,
    Paperclip,
    Phone,
    Send,
    User,
    X,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

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

interface ShowProps extends SharedData {
    ticket: TicketDetail;
    flash: {
        success?: string;
    };
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

function statusVariant(status: Status): 'default' | 'secondary' | 'outline' {
    switch (status) {
        case 'baru':
            return 'default';
        case 'respon_awal':
            return 'secondary';
        case 'respon_substantif':
            return 'outline';
        case 'selesai':
            return 'outline';
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

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export default function Show() {
    const { ticket, flash } = usePage<ShowProps>().props;

    const [showForward, setShowForward] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Response form
    const { data, setData, post, processing, errors, reset } = useForm({
        type: '' as string,
        message: '',
        attachments: [] as File[],
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview for uploaded files (before submit)
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const previewUrl = useMemo(() => {
        if (!previewFile) return null;
        return URL.createObjectURL(previewFile);
    }, [previewFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            setShowForward(false);
            reset();
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash, reset]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);

        const validFiles = newFiles.filter((file) => {
            const isLt2MB = file.size <= 2 * 1024 * 1024;
            const isValidType = isImageFile(file) || isPdfFile(file);
            return isLt2MB && isValidType;
        });

        const updated = [...data.attachments, ...validFiles].slice(0, 3);
        setData('attachments', updated);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        const updated = data.attachments.filter((_, i) => i !== index);
        setData('attachments', updated);
    };

    const handleSubmit = () => {
        post(route('dashboard.admin.laporan-masuk.responses.store', { ticket: ticket.id }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan"
            breadcrumbs={[
                { title: 'Laporan Masuk', href: route('dashboard.admin.laporan-masuk.index') },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
                {/* Success alert */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Back button & header */}
                <div className="flex items-center justify-between">
                    <Link
                        href={route('dashboard.admin.laporan-masuk.index')}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke Laporan Masuk
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
                                <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="size-3.5" />
                                <span>Diterima {formatFullDate(ticket.created_at)}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowForward(!showForward)}>
                                <Forward className="mr-1.5 size-4" />
                                Forward / Balas
                            </Button>
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
                        {ticket.completed_at && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Clock className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Selesai</p>
                                    <p className="text-sm font-medium">{formatFullDate(ticket.completed_at)}</p>
                                </div>
                            </div>
                        )}
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

                    {/* Forward / Balas section */}
                    {showForward && (
                        <>
                            <Separator />
                            <div className="px-6 py-5">
                                <h3 className="mb-4 text-sm font-semibold">Forward / Balas</h3>
                                <div className="space-y-4">
                                    {/* Jenis Respon dropdown */}
                                    <div className="space-y-2">
                                        <Label htmlFor="response-type">
                                            Jenis Respon <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={data.type} onValueChange={(val) => setData('type', val)}>
                                            <SelectTrigger id="response-type">
                                                <SelectValue placeholder="Pilih jenis respon" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="respon_awal">Respon Awal</SelectItem>
                                                <SelectItem value="respon_substantif">Respon Substantif</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                                    </div>

                                    {/* Pesan */}
                                    <div className="space-y-2">
                                        <Label htmlFor="response-message">
                                            Pesan <span className="text-destructive">*</span>
                                        </Label>
                                        <Textarea
                                            id="response-message"
                                            placeholder="Tulis pesan balasan atau catatan forward..."
                                            rows={4}
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                        />
                                        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                                    </div>

                                    {/* File Upload */}
                                    <div className="space-y-2">
                                        <Label>Lampiran (opsional)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file.
                                        </p>

                                        {data.attachments.length < 3 && (
                                            <div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    multiple
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    id="response-file-input"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Paperclip className="mr-2 h-4 w-4" />
                                                    Pilih File
                                                </Button>
                                            </div>
                                        )}

                                        {data.attachments.length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                {data.attachments.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            {isImageFile(file) ? (
                                                                <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                                            ) : (
                                                                <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                            )}
                                                            <span className="truncate font-medium">{file.name}</span>
                                                            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setPreviewFile(file)}
                                                                title="Lihat Pratinjau"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-destructive"
                                                                onClick={() => handleRemoveFile(index)}
                                                                title="Hapus File"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {errors.attachments && <p className="text-xs text-destructive">{errors.attachments}</p>}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setShowForward(false);
                                                reset();
                                            }}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={processing || !data.type || !data.message.trim()}
                                            onClick={handleSubmit}
                                        >
                                            {processing ? (
                                                <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                                            ) : (
                                                <Send className="mr-1.5 size-4" />
                                            )}
                                            Kirim Respon
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dialog Preview Lampiran (server-side attachments) */}
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

            {/* Dialog Preview File (client-side uploads before submit) */}
            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
                        <DialogDescription>{previewFile && formatFileSize(previewFile.size)}</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-auto">
                        {previewFile && previewUrl && isImageFile(previewFile) && (
                            <img
                                src={previewUrl}
                                alt={previewFile.name}
                                className="mx-auto max-h-[65vh] rounded-md object-contain"
                            />
                        )}

                        {previewFile && previewUrl && isPdfFile(previewFile) && (
                            <iframe src={previewUrl} title={previewFile.name} className="h-[65vh] w-full rounded-md border-0" />
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setPreviewFile(null)} className="w-full sm:w-auto">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
