import { AttachmentPreviewDialog } from '@/components/attachment-preview-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { type ClosedReason } from '@/pages/admin/laporan-selesai/show';
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
    Globe,
    Image as ImageIcon,
    Layers,
    LoaderCircle,
    Mail,
    Paperclip,
    Pencil,
    Phone,
    TimerOff,
    Trash2,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type ReplyConflict } from './components/realtime-types';
import { ResponseHistory } from './components/response-history';
import { type Attachment, type Classification, type Status, type TicketResponseItem } from './components/types';
import { useTicketRealtime } from './components/use-ticket-realtime';
import { formatFileSize, formatFullDate, isImageMime, isPdfMime } from './components/utils';

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
    version: number;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_by_name: string | null;
    completed_at: string | null;
    closed_reason: ClosedReason | null;
    auto_close_at: string | null;
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
        conflict?: ReplyConflict;
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

export default function Show() {
    const { auth, ticket, can, from, flash } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const isInputData = from === 'input-data' || ticket.source_app === 'admin';
    const backRouteName = isInputData ? `${routePrefix}.input-data.index` : `${routePrefix}.laporan-masuk.index`;
    const backLabel = isInputData ? 'Input Data' : 'Laporan Masuk';

    const canEdit = can?.edit ?? auth.user.role === 'admin';
    const canDelete = can?.delete ?? auth.user.role === 'admin';

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [previewAttachmentList, setPreviewAttachmentList] = useState<Attachment[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [responses, setResponses] = useState<TicketResponseItem[]>(ticket.responses);
    const [ticketStatus, setTicketStatus] = useState<Status>(ticket.status);
    const [ticketVersion, setTicketVersion] = useState<number>(ticket.version ?? 0);
    const [highlightLast, setHighlightLast] = useState(false);
    const [conflict, setConflict] = useState<ReplyConflict | null>(flash?.conflict ?? null);
    const [pendingNotice, setPendingNotice] = useState<string | null>(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const editForm = useForm({
        reporter_name: ticket.reporter_name ?? '',
        reporter_email: ticket.reporter_email ?? '',
        reporter_wa: ticket.reporter_wa ?? '',
        title: ticket.title ?? '',
        content: ticket.content ?? '',
    });

    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewFileList, setPreviewFileList] = useState<File[]>([]);

    useEffect(() => {
        setResponses(ticket.responses);
        setTicketStatus(ticket.status);
        setTicketVersion(ticket.version ?? 0);
    }, [ticket.responses, ticket.status, ticket.version]);

    useEffect(() => {
        if (flash?.conflict) {
            setConflict(flash.conflict);
            setShowReplyForm(true);
        }
    }, [flash?.conflict]);

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            setShowReplyForm(false);
            setPendingNotice(null);
            setHighlightLast(true);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when dialog opens
    }, [isEditOpen, ticket]);

    // Jumlah balasan saat form dibuka — dipakai untuk memberi tahu pengguna bahwa
    // ada balasan baru dari petugas lain sebelum ia menekan Kirim.
    const responsesAtFormOpen = useRef(responses.length);
    const showReplyFormRef = useRef(showReplyForm);
    showReplyFormRef.current = showReplyForm;
    const responseCountRef = useRef(responses.length);
    responseCountRef.current = responses.length;

    useEffect(() => {
        if (showReplyForm) {
            responsesAtFormOpen.current = responseCountRef.current;
            setPendingNotice(null);
        }
    }, [showReplyForm]);

    const handleIncomingResponse = useCallback((response: TicketResponseItem) => {
        setResponses((prev) => (prev.some((item) => item.id === response.id) ? prev : [...prev, response]));
        setHighlightLast(true);

        setPendingNotice((current) => {
            if (current !== null || !showReplyFormRef.current) {
                return current;
            }

            // Hanya beri peringatan bila balasan benar-benar baru Semenjak form dibuka.
            if (responsesAtFormOpen.current >= responseCountRef.current) {
                return current;
            }

            return `Ada balasan baru dari ${response.user_name}.`;
        });
    }, []);

    const {
        viewers,
        typingName,
        broadcastTyping,
        version: liveVersion,
    } = useTicketRealtime({
        ticketId: ticket.id,
        currentUserId: auth.user.id,
        initialVersion: ticketVersion,
        currentUserName: auth.user.name,
        onResponse: handleIncomingResponse,
        onStatusChange: (status, version) => {
            setTicketStatus(status);
            setTicketVersion((prev) => Math.max(prev, version));
        },
        onCompleted: () => {
            setShowReplyForm(false);
            setPendingNotice(null);
        },
    });

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
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Link
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                </div>

                <div className="bg-card rounded-lg border">
                    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                                <Badge variant={classificationVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                                <Badge variant={statusVariant(ticketStatus)}>{statusLabel(ticketStatus)}</Badge>
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
                                                onClick={() => {
                                                    setPreviewAttachment(att);
                                                    setPreviewAttachmentList(ticket.attachments);
                                                }}
                                            >
                                                <Eye className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ResponseHistory
                    responses={responses}
                    ticketId={ticket.id}
                    ticketStatus={ticketStatus}
                    expectedVersion={liveVersion}
                    routePrefix={routePrefix}
                    showReplyForm={showReplyForm}
                    viewers={viewers}
                    currentUserId={auth.user.id}
                    typingName={typingName}
                    pendingNotice={pendingNotice}
                    conflict={conflict}
                    onDismissConflict={() => setConflict(null)}
                    onToggleReply={() => setShowReplyForm(true)}
                    onCancelReply={() => {
                        setShowReplyForm(false);
                        setPendingNotice(null);
                    }}
                    onReplySuccess={() => {
                        setShowReplyForm(false);
                        setPendingNotice(null);
                        setHighlightLast(true);
                    }}
                    onPreviewAttachment={(att, list) => {
                        setPreviewAttachment(att);
                        setPreviewAttachmentList(list && list.length > 0 ? list : [att]);
                    }}
                    onPreviewFile={(file, files) => {
                        setPreviewFile(file);
                        setPreviewFileList(files && files.length > 0 ? files : [file]);
                    }}
                    onTyping={broadcastTyping}
                    highlightLast={highlightLast}
                />
            </div>

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

            <AttachmentPreviewDialog
                item={previewAttachment}
                items={previewAttachmentList}
                onClose={() => {
                    setPreviewAttachment(null);
                    setPreviewAttachmentList([]);
                }}
            />

            <AttachmentPreviewDialog
                item={previewFile}
                items={previewFileList}
                onClose={() => {
                    setPreviewFile(null);
                    setPreviewFileList([]);
                }}
            />
        </AdminPage>
    );
}
