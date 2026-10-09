import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Download,
    FileText,
    Image as ImageIcon,
    Inbox,
    LoaderCircle,
    MessageSquare,
    Paperclip,
    Search,
    Send,
    User,
    X,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

interface Attachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

interface TicketResponse {
    id: number;
    type: 'respon_awal' | 'respon_substantif' | 'balasan_pelapor';
    message: string;
    user_name: string;
    is_reporter?: boolean;
    sent_at: string | null;
    created_at: string;
    attachments: Attachment[];
}

interface TicketDetail {
    id: number;
    ticket_number: string;
    classification: Classification;
    title?: string | null;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    content: string;
    status: Status;
    channel: string;
    created_at: string;
    completed_at: string | null;
    attachments: Attachment[];
    responses: TicketResponse[];
}

interface CheckPageProps extends SharedData {
    ticketNumber: string;
    ticket: TicketDetail | null;
    searched: boolean;
    flash?: {
        success?: string;
    };
    errors?: Record<string, string>;
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

function classificationBadgeVariant(classification: Classification): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

function statusConfig(status: Status): { label: string; colorClass: string; icon: typeof Clock } {
    switch (status) {
        case 'baru':
            return {
                label: 'Menunggu Tanggapan',
                colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                icon: Clock,
            };
        case 'respon_awal':
            return {
                label: 'Respon Awal Dilakukan',
                colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
                icon: MessageSquare,
            };
        case 'respon_substantif':
            return {
                label: 'Respon Substantif Diberikan',
                colorClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                icon: MessageSquare,
            };
        case 'selesai':
            return {
                label: 'Selesai',
                colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                icon: CheckCircle2,
            };
    }
}

function responseTypeLabel(type: string): string {
    switch (type) {
        case 'respon_awal':
            return 'Respon Petugas';
        case 'respon_substantif':
            return 'Respon Petugas';
        case 'balasan_pelapor':
            return 'Balasan Pelapor';
        default:
            return type;
    }
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export default function CheckTicket() {
    const { auth, ticketNumber, ticket, searched, flash, errors: pageErrors } = usePage<CheckPageProps>().props;
    const [inputQuery, setInputQuery] = useState(ticketNumber || '');
    const [copied, setCopied] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        message: '',
        attachments: [] as File[],
    });

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        const trimmed = inputQuery.trim();
        if (!trimmed) return;

        router.get(route('tickets.check'), { ticket_number: trimmed }, { preserveState: true, preserveScroll: true });
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
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
    }

    function handleRemoveFile(index: number) {
        const updated = data.attachments.filter((_, i) => i !== index);
        setData('attachments', updated);
    }

    function handleSendReply(e: FormEvent) {
        e.preventDefault();
        if (!ticket) return;

        post(route('tickets.check.reply', { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowReplyForm(false);
            },
        });
    }

    function handleComplete() {
        if (!ticket) return;
        setCompleting(true);
        router.post(
            route('tickets.check.complete', { ticketNumber: ticket.ticket_number }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setCompleting(false),
            },
        );
    }

    return (
        <>
            <Head title="Cek Status Laporan / Tiket" />
            <div className="bg-background text-foreground min-h-screen">
                {/* Header Navigation */}
                <header className="border-b">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('home')}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Beranda
                            </Link>
                            <span className="text-muted-foreground">/</span>
                            <h1 className="text-base font-semibold">Cek Status Tiket</h1>
                        </div>
                        <nav className="flex items-center gap-4">
                            <AppearanceToggleDropdown />
                           
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
                    {/* Hero & Search Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-4 text-center">
                            <CardTitle className="text-2xl font-bold">Lacak & Cek Status Laporan</CardTitle>
                            <CardDescription className="text-sm">Masukkan kode tiket laporan Anda</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex flex-col items-center gap-3 sm:flex-row">
                                <div className="relative w-full flex-1">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        type="text"
                                        placeholder="Masukkan kode tiket..."
                                        className="h-11 pl-10 font-mono text-base uppercase"
                                        value={inputQuery}
                                        onChange={(e) => setInputQuery(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" size="lg" className="h-11 w-full px-6 font-medium sm:w-auto">
                                    Cek Status
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Global Flash / Notification */}
                    {successMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {pageErrors?.message && (
                        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>{pageErrors.message}</span>
                        </div>
                    )}

                    {/* Result Section */}
                    {searched && !ticket && (
                        <Card className="border-destructive/30 bg-destructive/5 text-destructive border">
                            <CardContent className="flex items-start gap-4 p-6">
                                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold">Tiket Tidak Ditemukan</h3>
                                    <p className="text-sm opacity-90">
                                        Nomor tiket <strong className="font-mono">{ticketNumber}</strong> tidak ditemukan di sistem. Harap periksa
                                        kembali penulisan nomor tiket Anda.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {searched && ticket && (
                        <div className="space-y-6">
                            {/* Ticket Summary Card */}
                            <Card className="border shadow-sm">
                                <CardHeader className="bg-muted/30 border-b pb-4">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Kode Tiket</span>
                                                <Badge variant={classificationBadgeVariant(ticket.classification)}>
                                                    {classificationLabel(ticket.classification)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xl font-bold sm:text-2xl">{ticket.ticket_number}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                    onClick={() => handleCopy(ticket.ticket_number)}
                                                    title="Salin Kode Tiket"
                                                >
                                                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const statusInfo = statusConfig(ticket.status);
                                                const StatusIcon = statusInfo.icon;
                                                return (
                                                    <div
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusInfo.colorClass}`}
                                                    >
                                                        <StatusIcon className="h-4 w-4" />
                                                        <span>{statusInfo.label}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-6 pt-6">
                                    {/* Metadata Grid */}
                                    <div className="bg-card grid grid-cols-1 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground text-xs">Tanggal Pengajuan</p>
                                                <p className="font-medium">{formatDateTime(ticket.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <User className="text-muted-foreground h-4 w-4 shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground text-xs">Pelapor</p>
                                                <p className="font-medium">{ticket.reporter_name || 'Anonim'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Inbox className="text-muted-foreground h-4 w-4 shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground text-xs">Saluran Pengaduan</p>
                                                <p className="font-medium">{ticket.channel}</p>
                                            </div>
                                        </div>

                                        {ticket.service_type && (
                                            <div className="flex items-center gap-3 border-t pt-3 sm:col-span-2 lg:col-span-3">
                                                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Jenis Layanan / Satuan Tugas</p>
                                                    <p className="font-medium">
                                                        {ticket.service_type} {ticket.satuan_tugas ? `(${ticket.satuan_tugas})` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    {ticket.title && (
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                                Judul Laporan
                                            </Label>
                                            <h3 className="text-foreground text-base font-semibold">{ticket.title}</h3>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                            Isi Laporan / Pesan Awal
                                        </Label>
                                        <div className="bg-muted/20 rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                            {ticket.content}
                                        </div>
                                    </div>

                                    {/* Report Attachments */}
                                    {ticket.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                                Lampiran Pelapor
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {ticket.attachments.map((att) => (
                                                    <a
                                                        key={att.id}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-card hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors"
                                                    >
                                                        <Paperclip className="text-muted-foreground h-3.5 w-3.5" />
                                                        <span className="max-w-[200px] truncate">{att.original_name}</span>
                                                        <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                                                        <Download className="text-muted-foreground ml-1 h-3.5 w-3.5" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Responses & Conversation Section */}
                            <Card className="border shadow-sm">
                                <CardHeader className="bg-muted/30 border-b pb-4">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="text-primary h-5 w-5" />
                                            <CardTitle className="text-lg font-bold">Diskusi & Tanggapan Petugas</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{ticket.responses.length} Tanggapan</Badge>
                                            {ticket.status !== 'selesai' && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={completing}
                                                    onClick={handleComplete}
                                                    className="gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                                >
                                                    {completing ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    )}
                                                    Tandai Selesai
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {ticket.responses.length === 0 ? (
                                        <div className="text-muted-foreground space-y-2 py-8 text-center">
                                            <Clock className="mx-auto h-10 w-10 opacity-40" />
                                            <p className="font-medium">Belum Ada Tanggapan</p>
                                            <p className="mx-auto max-w-md text-xs opacity-80">
                                                Laporan Anda telah diterima dan sedang diproses oleh tim kami. Tanggapan akan ditampilkan di halaman
                                                ini setelah ditanggapi oleh petugas.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {ticket.responses.map((res) => {
                                                const isReporter = res.is_reporter || res.type === 'balasan_pelapor';
                                                return (
                                                    <div
                                                        key={res.id}
                                                        className={`relative border-l-2 pb-6 pl-6 ${
                                                            isReporter ? 'border-blue-500/30' : 'border-primary/30'
                                                        } last:border-l-0 last:pb-0`}
                                                    >
                                                        <span
                                                            className={`absolute top-0 -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${
                                                                isReporter ? 'bg-blue-600' : 'bg-primary'
                                                            } ring-background ring-4`}
                                                        >
                                                            {isReporter ? (
                                                                <User className="h-2.5 w-2.5 text-white" />
                                                            ) : (
                                                                <CheckCircle2 className="text-primary-foreground h-3 w-3" />
                                                            )}
                                                        </span>

                                                        <div
                                                            className={`space-y-3 rounded-lg border p-4 shadow-xs ${
                                                                isReporter
                                                                    ? 'border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20'
                                                                    : 'bg-card'
                                                            }`}
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant={
                                                                            isReporter
                                                                                ? 'secondary'
                                                                                : res.type === 'respon_substantif'
                                                                                  ? 'default'
                                                                                  : 'outline'
                                                                        }
                                                                        className="text-[11px]"
                                                                    >
                                                                        {responseTypeLabel(res.type)}
                                                                    </Badge>
                                                                    {res.user_name !== "Operator" && res.user_name !== "Admin" && (
                                                                        <span className="text-xs font-semibold">{res.user_name}</span>
                                                                        )}
                                                                </div>
                                                                <span className="text-muted-foreground text-xs">
                                                                    {res.sent_at ? formatDateTime(res.sent_at) : formatDateTime(res.created_at)}
                                                                </span>
                                                            </div>

                                                            <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                                                {res.message}
                                                            </div>

                                                            {res.attachments.length > 0 && (
                                                                <div className="space-y-1.5 border-t pt-2">
                                                                    <span className="text-muted-foreground text-xs font-medium">Lampiran:</span>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {res.attachments.map((att) => (
                                                                            <a
                                                                                key={att.id}
                                                                                href={att.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="bg-muted/50 hover:bg-accent inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
                                                                            >
                                                                                <Paperclip className="text-muted-foreground h-3.5 w-3.5" />
                                                                                <span className="max-w-[180px] truncate">{att.original_name}</span>
                                                                                <Download className="text-muted-foreground h-3.5 w-3.5" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Action Area for Reporter when ticket is active */}
                                    {ticket.status !== 'selesai' && (
                                        <div className="space-y-4 border-t pt-6">
                                            {!showReplyForm ? (
                                                <div className="bg-muted/30 flex flex-col items-center justify-between gap-3 rounded-lg border p-4 sm:flex-row">
                                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                                        Ada yang ingin ditanyakan lagi atau perlu tanggapan tambahan?
                                                    </p>
                                                    <div className="flex w-full items-center gap-2 sm:w-auto">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleComplete}
                                                            disabled={completing}
                                                            className="flex-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 sm:flex-initial dark:text-emerald-400"
                                                        >
                                                            {completing ? (
                                                                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                            )}
                                                            Selesai
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => setShowReplyForm(true)}
                                                            className="flex-1 sm:flex-initial"
                                                        >
                                                            <Send className="mr-1.5 h-4 w-4" />
                                                            Balas Laporan
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleSendReply} className="bg-card space-y-4 rounded-lg border p-4 shadow-xs">
                                                    <div className="flex items-center justify-between border-b pb-3">
                                                        <h4 className="flex items-center gap-2 text-sm font-semibold">
                                                            <Send className="text-primary h-4 w-4" />
                                                            Kirim Balasan Pelapor
                                                        </h4>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setShowReplyForm(false)}
                                                            className="text-muted-foreground h-7 w-7 p-0"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="reply-message">
                                                            Pesan Balasan <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Textarea
                                                            id="reply-message"
                                                            placeholder="Tulis balasan atau penjelasan tambahan Anda untuk petugas BPS..."
                                                            rows={3}
                                                            value={data.message}
                                                            onChange={(e) => setData('message', e.target.value)}
                                                            required
                                                        />
                                                        {errors.message && <p className="text-destructive text-xs">{errors.message}</p>}
                                                    </div>

                                                    {/* File Upload */}
                                                    <div className="space-y-2">
                                                        <Label>Lampiran Balasan (opsional)</Label>
                                                        <p className="text-muted-foreground text-xs">
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
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                >
                                                                    <Paperclip className="mr-2 h-4 w-4" />
                                                                    Pilih File Lampiran
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
                                                                            <span className="text-muted-foreground">
                                                                                ({formatFileSize(file.size)})
                                                                            </span>
                                                                        </div>
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
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 border-t pt-2">
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>
                                                            Batal
                                                        </Button>
                                                        <Button type="submit" size="sm" disabled={processing || !data.message.trim()}>
                                                            {processing ? (
                                                                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Send className="mr-1.5 h-4 w-4" />
                                                            )}
                                                            Kirim Balasan
                                                        </Button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

