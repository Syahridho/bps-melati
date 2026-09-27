import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    Inbox,
    MessageSquare,
    Paperclip,
    Search,
    User,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

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
    classification: Classification;
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

export default function CheckTicket() {
    const { auth, ticketNumber, ticket, searched } = usePage<CheckPageProps>().props;
    const [inputQuery, setInputQuery] = useState(ticketNumber || '');
    const [copied, setCopied] = useState(false);

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        const trimmed = inputQuery.trim();
        if (!trimmed) return;

        router.get(
            route('tickets.check'),
            { ticket_number: trimmed },
            { preserveState: true, preserveScroll: true },
        );
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <>
            <Head title="Cek Status Laporan / Tiket" />
            <div className="min-h-screen bg-background text-foreground">
                {/* Header Navigation */}
                <header className="border-b">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('home')}
                                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Beranda
                            </Link>
                            <span className="text-muted-foreground">/</span>
                            <h1 className="text-base font-semibold">Cek Status Tiket</h1>
                        </div>
                        <nav className="flex items-center gap-4">
                            <AppearanceToggleDropdown />
                            {auth.user ? (
                                <Link
                                    href={auth.user.role === 'admin' ? route('dashboard.admin.index') : route('dashboard.operator.index')}
                                    className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="inline-block rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                >
                                    Log in
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
                    {/* Hero & Search Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-2xl font-bold">Lacak & Cek Status Laporan</CardTitle>
                            <CardDescription className="text-sm">
                                Masukkan kode tiket laporan Anda (contoh: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">L-1400/092026/0001</code>) untuk melihat status penanganan dan jawaban dari petugas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Masukkan kode tiket..."
                                        className="pl-10 h-11 text-base uppercase font-mono"
                                        value={inputQuery}
                                        onChange={(e) => setInputQuery(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" size="lg" className="w-full sm:w-auto h-11 px-6 font-medium">
                                    Cek Status
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Result Section */}
                    {searched && !ticket && (
                        <Card className="border border-destructive/30 bg-destructive/5 text-destructive">
                            <CardContent className="flex items-start gap-4 p-6">
                                <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-base">Tiket Tidak Ditemukan</h3>
                                    <p className="text-sm opacity-90">
                                        Nomor tiket <strong className="font-mono">{ticketNumber}</strong> tidak ditemukan di sistem. Harap periksa kembali penulisan nomor tiket Anda.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {searched && ticket && (
                        <div className="space-y-6">
                            {/* Ticket Summary Card */}
                            <Card className="border shadow-sm">
                                <CardHeader className="border-b bg-muted/30 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kode Tiket</span>
                                                <Badge variant={classificationBadgeVariant(ticket.classification)}>
                                                    {classificationLabel(ticket.classification)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl sm:text-2xl font-mono font-bold">{ticket.ticket_number}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleCopy(ticket.ticket_number)}
                                                    title="Salin Kode Tiket"
                                                >
                                                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            {(() => {
                                                const statusInfo = statusConfig(ticket.status);
                                                const StatusIcon = statusInfo.icon;
                                                return (
                                                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusInfo.colorClass}`}>
                                                        <StatusIcon className="h-4 w-4" />
                                                        <span>{statusInfo.label}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg border bg-card p-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Tanggal Pengajuan</p>
                                                <p className="font-medium">{formatDateTime(ticket.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Pelapor</p>
                                                <p className="font-medium">{ticket.reporter_name || 'Anonim'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Saluran Pengaduan</p>
                                                <p className="font-medium">{ticket.channel}</p>
                                            </div>
                                        </div>

                                        {ticket.service_type && (
                                            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3 border-t pt-3">
                                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Jenis Layanan / Satuan Tugas</p>
                                                    <p className="font-medium">{ticket.service_type} {ticket.satuan_tugas ? `(${ticket.satuan_tugas})` : ''}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Isi Laporan / Pesan</Label>
                                        <div className="rounded-lg border bg-muted/20 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                                            {ticket.content}
                                        </div>
                                    </div>

                                    {/* Report Attachments */}
                                    {ticket.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Lampiran Pelapor</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {ticket.attachments.map((att) => (
                                                    <a
                                                        key={att.id}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                                                    >
                                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="max-w-[200px] truncate">{att.original_name}</span>
                                                        <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                                                        <Download className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Responses Section */}
                            <Card className="border shadow-sm">
                                <CardHeader className="border-b bg-muted/30 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-lg font-bold">Tanggapan Petugas BPS</CardTitle>
                                        </div>
                                        <Badge variant="outline">{ticket.responses.length} Tanggapan</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {ticket.responses.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground space-y-2">
                                            <Clock className="h-10 w-10 mx-auto opacity-40" />
                                            <p className="font-medium">Belum Ada Tanggapan Publik</p>
                                            <p className="text-xs max-w-md mx-auto opacity-80">
                                                Laporan Anda telah diterima dan sedang diproses oleh tim kami. Tanggapan akan ditampilkan di halaman ini setelah diverifikasi oleh petugas.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {ticket.responses.map((res) => (
                                                <div
                                                    key={res.id}
                                                    className="relative pl-6 pb-6 border-l-2 border-primary/30 last:border-l-0 last:pb-0"
                                                >
                                                    <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                                                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                                    </span>

                                                    <div className="rounded-lg border bg-card p-4 space-y-3 shadow-xs">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={res.type === 'respon_substantif' ? 'default' : 'secondary'}
                                                                    className="text-[11px]"
                                                                >
                                                                    {res.type === 'respon_substantif' ? 'Respon Substantif / Jawaban Akhir' : 'Respon Awal'}
                                                                </Badge>
                                                                <span className="text-xs font-semibold">{res.user_name}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {res.sent_at ? formatDateTime(res.sent_at) : formatDateTime(res.created_at)}
                                                            </span>
                                                        </div>

                                                        <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                                                            {res.message}
                                                        </div>

                                                        {res.attachments.length > 0 && (
                                                            <div className="pt-2 border-t space-y-1.5">
                                                                <span className="text-xs font-medium text-muted-foreground">Lampiran Tanggapan:</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {res.attachments.map((att) => (
                                                                        <a
                                                                            key={att.id}
                                                                            href={att.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                                                                        >
                                                                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            <span className="max-w-[180px] truncate">{att.original_name}</span>
                                                                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
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
