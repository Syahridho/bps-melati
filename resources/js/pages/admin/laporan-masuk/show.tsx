import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
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
    Pencil,
    Phone,
    Send,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
    title?: string | null;
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
    can?: {
        edit: boolean;
        delete: boolean;
    };
    from?: 'input-data' | 'laporan-masuk';
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
        case 'balasan_pelapor':
            return 'Balasan Pelapor';
        default:
            return type;
    }
}

function responseTypeVariant(type: string): 'default' | 'secondary' | 'outline' {
    if (type === 'balasan_pelapor') return 'outline';
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
    const { auth, ticket, can, from, flash } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const isInputData = from === 'input-data' || ticket.source_app === 'admin';
    const backRouteName = isInputData ? `${routePrefix}.input-data.index` : `${routePrefix}.laporan-masuk.index`;
    const backLabel = isInputData ? 'Input Data' : 'Laporan Masuk';

    const canEdit = can?.edit ?? auth.user.role === 'admin';
    const canDelete = can?.delete ?? auth.user.role === 'admin';

    const [showForward, setShowForward] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modals state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Response form
    const { data, setData, post, processing, errors, reset } = useForm({
        type: '' as string,
        message: '',
        attachments: [] as File[],
    });

    // Edit form
    const editForm = useForm({
        reporter_name: ticket.reporter_name ?? '',
        reporter_email: ticket.reporter_email ?? '',
        reporter_wa: ticket.reporter_wa ?? '',
        title: ticket.title ?? '',
        content: ticket.content ?? '',
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

    // Reset edit form values when edit dialog opens or ticket changes
    useEffect(() => {
        if (isEditOpen) {
            editForm.setData({
                reporter_name: ticket.reporter_name ?? '',
                reporter_email: ticket.reporter_email ?? '',
                reporter_wa: ticket.reporter_wa ?? '',
                title: ticket.title ?? '',
                content: ticket.content ?? '',
            });
            editForm.clearErrors();
        }
    }, [isEditOpen, ticket]);

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
        post(route(`${routePrefix}.laporan-masuk.responses.store`, { ticket: ticket.id }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success('Tanggapan berhasil dikirim', {
                    description: 'Status laporan diperbarui dan email terkirim ke pelapor.',
                });
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error('Gagal mengirim tanggapan', {
                    description: firstError ?? 'Periksa kembali isian Anda.',
                });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(route(`${routePrefix}.laporan-masuk.update`, { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditOpen(false);
                toast.success('Laporan berhasil diperbarui');
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui laporan', {
                    description: firstError ?? 'Periksa kembali isian Anda.',
                });
            },
        });
    };

    const handleDeleteSubmit = () => {
        setIsDeleting(true);
        router.delete(route(`${routePrefix}.laporan-masuk.destroy`, { ticketNumber: ticket.ticket_number }), {
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                toast.success('Laporan berhasil dihapus');
            },
            onError: () => {
                toast.error('Gagal menghapus laporan');
            },
        });
    };

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan"
            breadcrumbs={[
                { title: backLabel, href: route(backRouteName) },
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
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                </div>

                {/* Main card */}
                <div className="bg-card rounded-lg border">
                    {/* Header */}
                    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                                <Badge variant={classificationVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                                <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                <Clock className="size-3.5" />
                                <span>Diterima {formatFullDate(ticket.created_at)}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {canEdit && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                                    <Pencil className="mr-1.5 size-4" />
                                    Edit
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setIsDeleteOpen(true)}
                                >
                                    <Trash2 className="mr-1.5 size-4" />
                                    Hapus
                                </Button>
                            )}
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

                    {/* Judul & Isi laporan */}
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

                        {/* Lampiran pelapor */}
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
                                            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setPreviewAttachment(att)}>
                                                <Eye className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Forward / Balas (Collapsible) */}
                {showForward && (
                    <div className="bg-card rounded-lg border p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Forward / Tindak Lanjut Laporan</h3>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowForward(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="type" className="mb-1.5 block">
                                    Jenis Respon <span className="text-destructive">*</span>
                                </Label>
                                <Select value={data.type} onValueChange={(val) => setData('type', val)}>
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Pilih jenis respon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="respon_awal">Respon Awal (Informasi telah diterima & diproses)</SelectItem>
                                        <SelectItem value="respon_substantif">Respon Substantif (Jawaban lengkap / penyelesaian)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-destructive mt-1 text-xs">{errors.type}</p>}
                            </div>

                            <div>
                                <Label htmlFor="message" className="mb-1.5 block">
                                    Pesan Tanggapan <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="message"
                                    rows={5}
                                    placeholder="Tuliskan pesan tanggapan yang akan dikirimkan kepada pelapor..."
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                />
                                {errors.message && <p className="text-destructive mt-1 text-xs">{errors.message}</p>}
                            </div>

                            {/* Attachments */}
                            <div>
                                <Label className="mb-1.5 block">Lampiran (Opsional, maks 3 file, total maks 2MB/file)</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                        <Paperclip className="mr-2 h-4 w-4" />
                                        Pilih File
                                    </Button>
                                </div>

                                {data.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {data.attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
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
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive h-6 w-6"
                                                        onClick={() => handleRemoveFile(index)}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setShowForward(false)}>
                                    Batal
                                </Button>
                                <Button onClick={handleSubmit} disabled={processing}>
                                    {processing ? (
                                        <>
                                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 size-4" />
                                            Kirim Tanggapan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Riwayat Tanggapan */}
                {ticket.responses && ticket.responses.length > 0 && (
                    <div className="bg-card rounded-lg border p-6">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold">
                            <MessageSquare className="size-4" />
                            Riwayat Tanggapan ({ticket.responses.length})
                        </h3>
                        <div className="space-y-4">
                            {ticket.responses.map((resp) => (
                                <div key={resp.id} className="bg-muted/20 space-y-2 rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{resp.user_name}</span>
                                            <Badge variant={responseTypeVariant(resp.type)} className="text-[10px]">
                                                {responseTypeLabel(resp.type)}
                                            </Badge>
                                        </div>
                                        <span className="text-muted-foreground text-xs">{formatFullDate(resp.sent_at || resp.created_at)}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{resp.message}</p>
                                    {resp.attachments && resp.attachments.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">Lampiran:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {resp.attachments.map((att) => (
                                                    <Button
                                                        key={att.id}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 gap-1.5 text-xs"
                                                        onClick={() => setPreviewAttachment(att)}
                                                    >
                                                        <Paperclip className="size-3" />
                                                        <span className="max-w-[150px] truncate">{att.original_name}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Edit (Hanya Admin) */}
            {canEdit && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Pencil className="text-primary size-5" />
                                Edit Laporan
                            </DialogTitle>
                            <DialogDescription>Perbarui data informasi pelapor, judul, dan isi laporan.</DialogDescription>
                        </DialogHeader>

                        {/* Readonly info header */}
                        <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Nomor Tiket:</span>
                                <span className="text-foreground font-semibold">{ticket.ticket_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Klasifikasi:</span>
                                <span className="text-foreground font-medium">{classificationLabel(ticket.classification)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Periode & Urut:</span>
                                <span className="text-foreground font-medium">
                                    {ticket.period} (Urut #{ticket.sequence})
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div>
                                <Label htmlFor="edit_reporter_name" className="mb-1 block text-xs">
                                    Nama Pelapor
                                </Label>
                                <Input
                                    id="edit_reporter_name"
                                    placeholder="Masukkan nama pelapor"
                                    value={editForm.data.reporter_name}
                                    onChange={(e) => editForm.setData('reporter_name', e.target.value)}
                                />
                                {editForm.errors.reporter_name && <p className="text-destructive mt-1 text-xs">{editForm.errors.reporter_name}</p>}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="edit_reporter_email" className="mb-1 block text-xs">
                                        Email
                                    </Label>
                                    <Input
                                        id="edit_reporter_email"
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={editForm.data.reporter_email}
                                        onChange={(e) => editForm.setData('reporter_email', e.target.value)}
                                    />
                                    {editForm.errors.reporter_email && (
                                        <p className="text-destructive mt-1 text-xs">{editForm.errors.reporter_email}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="edit_reporter_wa" className="mb-1 block text-xs">
                                        WhatsApp (Angka saja)
                                    </Label>
                                    <Input
                                        id="edit_reporter_wa"
                                        placeholder="08123456789"
                                        value={editForm.data.reporter_wa}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            editForm.setData('reporter_wa', val);
                                        }}
                                    />
                                    {editForm.errors.reporter_wa && <p className="text-destructive mt-1 text-xs">{editForm.errors.reporter_wa}</p>}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="edit_title" className="mb-1 block text-xs">
                                    Judul Laporan <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit_title"
                                    placeholder="Masukkan judul laporan"
                                    value={editForm.data.title}
                                    onChange={(e) => editForm.setData('title', e.target.value)}
                                />
                                {editForm.errors.title && <p className="text-destructive mt-1 text-xs">{editForm.errors.title}</p>}
                            </div>

                            <div>
                                <Label htmlFor="edit_content" className="mb-1 block text-xs">
                                    Isi Laporan <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="edit_content"
                                    rows={5}
                                    placeholder="Tuliskan isi laporan..."
                                    value={editForm.data.content}
                                    onChange={(e) => editForm.setData('content', e.target.value)}
                                />
                                {editForm.errors.content && <p className="text-destructive mt-1 text-xs">{editForm.errors.content}</p>}
                            </div>

                            <DialogFooter className="gap-2 pt-2 sm:gap-0">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    {editForm.processing ? (
                                        <>
                                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan Perubahan'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal Hapus (Hanya Admin) */}
            {canDelete && (
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2 text-lg">
                                <AlertTriangle className="size-5" />
                                Hapus Laporan?
                            </DialogTitle>
                            <DialogDescription className="space-y-2 pt-2">
                                <p>
                                    Apakah Anda yakin ingin menghapus laporan dengan nomor tiket{' '}
                                    <strong className="text-foreground">{ticket.ticket_number}</strong>?
                                </p>
                                {ticket.title && (
                                    <p className="bg-muted text-foreground truncate rounded-md p-2 text-xs font-medium">"{ticket.title}"</p>
                                )}
                                <p className="text-destructive text-xs">
                                    Tindakan ini permanen dan tidak dapat dibatalkan. Seluruh data terkait (termasuk lampiran dan riwayat balasan)
                                    akan terhapus dari sistem.
                                </p>
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="gap-2 pt-3 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                                Batal
                            </Button>
                            <Button type="button" variant="destructive" onClick={handleDeleteSubmit} disabled={isDeleting}>
                                {isDeleting ? (
                                    <>
                                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                                        Menghapus...
                                    </>
                                ) : (
                                    'Ya, Hapus'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Dialog Preview Lampiran Publik */}
            <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
                <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate text-base">{previewAttachment?.original_name}</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center justify-center overflow-auto py-2">
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
                            className="text-muted-foreground inline-flex items-center text-xs hover:underline"
                        >
                            Buka di tab baru
                        </a>
                        <Button onClick={() => setPreviewAttachment(null)} className="w-full sm:w-auto">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Preview File Upload */}
            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate text-base">{previewFile?.name}</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center justify-center overflow-auto py-2">
                        {previewFile && isImageFile(previewFile) && previewUrl && (
                            <img src={previewUrl} alt={previewFile.name} className="mx-auto max-h-[65vh] rounded-md object-contain" />
                        )}

                        {previewFile && isPdfFile(previewFile) && previewUrl && (
                            <iframe src={previewUrl} title={previewFile.name} className="h-[65vh] w-full rounded-md border-0" />
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setPreviewFile(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
