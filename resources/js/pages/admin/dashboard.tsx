import { ChartAreaLinear, type TrendPoint } from '@/components/chart-area-linear';
import { ChartPieDonutText } from '@/components/chart-pie-donut-text';
import { ChartPieLabel } from '@/components/chart-pie-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
type ChannelKey = 'span_lapor' | 'sosial_media' | 'kunjungan_langsung' | 'wbs' | 'email' | 'website';

interface DashboardStats {
    total: number;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
    span_lapor: number;
    sosial_media: number;
    kunjungan_langsung: number;
    wbs: number;
    email: number;
    website: number;
    baru: number;
    respon_awal: number;
    respon_substantif: number;
    selesai: number;
}

interface TicketSummary {
    id: number;
    ticket_number: string;
    classification: Classification;
    reporter_name: string | null;
    content: string;
    status: Status;
    channel: string;
    created_at: string;
}

interface AdminDashboardProps {
    stats: DashboardStats;
    trend: TrendPoint[];
    recentTickets: TicketSummary[];
    periodLabel: string;
}

const channelCards: {
    key: ChannelKey;
    label: string;
    card: string;
    text: string;
}[] = [
    {
        key: 'span_lapor',
        label: 'SP4N-LAPOR!',
        card: 'border-violet-400/30 bg-violet-400/5',
        text: 'text-violet-600 dark:text-violet-400',
    },
    {
        key: 'sosial_media',
        label: 'Sosial Media',
        card: 'border-pink-400/30 bg-pink-400/5',
        text: 'text-pink-500 dark:text-pink-400',
    },
    {
        key: 'kunjungan_langsung',
        label: 'Kunjungan Langsung',
        card: 'border-lime-500/30 bg-lime-500/5',
        text: 'text-lime-600 dark:text-lime-400',
    },
    {
        key: 'wbs',
        label: 'WBS',
        card: 'border-orange-400/30 bg-orange-400/5',
        text: 'text-orange-600 dark:text-orange-400',
    },
    {
        key: 'email',
        label: 'Email',
        card: 'border-teal-400/30 bg-teal-400/5',
        text: 'text-teal-600 dark:text-teal-400',
    },
    {
        key: 'website',
        label: 'Website',
        card: 'border-sky-400/30 bg-sky-400/5',
        text: 'text-sky-500 dark:text-sky-400',
    },
];

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

function classificationBadgeClass(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'border-transparent bg-red-500 text-white hover:bg-red-500';
        case 'aspirasi':
            return 'border-transparent bg-yellow-500 text-yellow-950 hover:bg-yellow-500';
        case 'permintaan_informasi':
            return 'border-transparent bg-indigo-500 text-white hover:bg-indigo-500';
    }
}

function statusBadge(status: Status): { label: string; className: string } {
    switch (status) {
        case 'baru':
            return {
                label: 'Belum Dibalas',
                className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
            };
        case 'respon_awal':
            return {
                label: 'Respon Awal',
                className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
            };
        case 'respon_substantif':
            return {
                label: 'Respon Substantif',
                className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
            };
        case 'selesai':
            return {
                label: 'Selesai',
                className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            };
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminDashboard({ stats, trend, recentTickets, periodLabel }: AdminDashboardProps) {
    return (
        <AdminPage breadcrumbs={[{ title: 'Dashboard Admin', href: route('dashboard.admin.index') }]}>
            <Head title="Dashboard Admin" />
            <div className="w-full max-w-full min-w-0 space-y-6">
                {/* Header periode */}
                <div className="flex flex-col gap-1">
                    <h2 className="text-sm leading-snug font-semibold break-words sm:text-base">
                        PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU
                    </h2>
                    <p className="text-muted-foreground text-xs">Menampilkan data: {periodLabel}</p>
                </div>

                <div className="min-w-0 space-y-6">
                    {/* Kartu klasifikasi */}
                    <p className="mb-2 text-xs font-semibold">Klasifikasi Laporan</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                        {/* Jumlah Total - Slate */}
                        <Card className="min-w-0 border border-slate-400/30 bg-slate-400/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                                <CardTitle className="text-sm leading-tight font-medium text-slate-600 dark:text-slate-300">Jumlah Total</CardTitle>
                                <FileText className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">{stats.total}</div>
                                <p className="text-muted-foreground mt-1 text-xs">Keseluruhan laporan yang diterima</p>
                            </CardContent>
                        </Card>

                        {/* Pengaduan - Red */}
                        <Card className="min-w-0 border border-red-400/30 bg-red-400/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                                <CardTitle className="text-sm leading-tight font-medium text-red-600 dark:text-red-400">Pengaduan</CardTitle>
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.pengaduan}</div>
                                <Badge className="mt-1 border-transparent bg-red-500 px-1.5 py-0 text-[10px] text-white hover:bg-red-500">
                                    Laporan Masalah
                                </Badge>
                            </CardContent>
                        </Card>

                        {/* Aspirasi - Yellow */}
                        <Card className="min-w-0 border border-yellow-400/40 bg-yellow-400/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                                <CardTitle className="text-sm leading-tight font-medium text-yellow-700 dark:text-yellow-400">Aspirasi</CardTitle>
                                <Lightbulb className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.aspirasi}</div>
                                <Badge className="mt-1 border-transparent bg-yellow-500 px-1.5 py-0 text-[10px] text-yellow-950 hover:bg-yellow-500">
                                    Saran & Masukan
                                </Badge>
                            </CardContent>
                        </Card>

                        {/* Permintaan Informasi - Indigo */}
                        <Card className="min-w-0 border border-indigo-400/30 bg-indigo-400/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                                <CardTitle className="text-sm leading-tight font-medium text-indigo-600 dark:text-indigo-400">
                                    Permintaan Informasi
                                </CardTitle>
                                <HelpCircle className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.permintaan_informasi}</div>
                                <Badge className="mt-1 border-transparent bg-indigo-500 px-1.5 py-0 text-[10px] text-white hover:bg-indigo-500">
                                    Permohonan Data
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kartu kanal */}
                    <p className="mb-2 text-xs font-semibold">Sumber kanal</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
                        {channelCards.map(({ key, label, card, text }) => {
                            const value = stats[key] ?? 0;

                            return (
                                <Card key={key} className={cn('min-w-0 border shadow-xs transition-shadow hover:shadow-sm', card)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className={cn('text-xs leading-tight font-medium', text)}>{label}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="!pb-2">
                                        <div className={cn('text-3xl font-bold', text)}>{value}</div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pie charts */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ChartPieDonutText stats={stats} />
                        <ChartPieLabel stats={stats} />
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                        <Card className="min-w-0 border border-amber-500/30 bg-amber-500/5">
                            <CardContent className="flex items-center justify-between gap-2 p-4">
                                <div className="min-w-0 space-y-0.5">
                                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Belum Dibalas (Baru)</p>
                                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.baru}</p>
                                </div>
                                <Clock className="h-8 w-8 shrink-0 text-amber-500 opacity-80" />
                            </CardContent>
                        </Card>

                        <Card className="min-w-0 border border-blue-500/30 bg-blue-500/5">
                            <CardContent className="flex items-center justify-between gap-2 p-4">
                                <div className="min-w-0 space-y-0.5">
                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Dalam Proses Respon</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                        {stats.respon_awal + stats.respon_substantif}
                                    </p>
                                </div>
                                <MessageSquare className="h-8 w-8 shrink-0 text-blue-500 opacity-80" />
                            </CardContent>
                        </Card>

                        <Card className="min-w-0 border border-emerald-500/30 bg-emerald-500/5">
                            <CardContent className="flex items-center justify-between gap-2 p-4">
                                <div className="min-w-0 space-y-0.5">
                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Telah Selesai</p>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.selesai}</p>
                                </div>
                                <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500 opacity-80" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tren */}
                    <ChartAreaLinear data={trend} periodLabel={periodLabel} />

                    {/* Laporan terbaru */}
                    <Card className="min-w-0 overflow-hidden border shadow-xs">
                        <CardHeader className="flex flex-col items-start gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base font-bold">Laporan Terbaru Masuk</CardTitle>
                                <CardDescription className="text-xs">
                                    Daftar 7 laporan atau konsultasi terbaru pada periode: {periodLabel}
                                </CardDescription>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs font-medium">
                                <Link href={route('dashboard.admin.laporan-masuk.index')}>
                                    Lihat Semua
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentTickets.length === 0 ? (
                                <div className="text-muted-foreground py-8 text-center text-xs">Belum ada laporan pada periode ini.</div>
                            ) : (
                                <>
                                    {/* Mobile: daftar kartu */}
                                    <div className="divide-y md:hidden">
                                        {recentTickets.map((ticket) => {
                                            const sBadge = statusBadge(ticket.status);
                                            return (
                                                <div key={ticket.id} className="space-y-2 p-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <Link
                                                            href={route('dashboard.admin.laporan-masuk.show', {
                                                                ticketNumber: ticket.ticket_number,
                                                            })}
                                                            className="text-primary font-mono text-xs font-medium break-all hover:underline"
                                                        >
                                                            {ticket.ticket_number}
                                                        </Link>
                                                        <span
                                                            className={cn(
                                                                'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                                sBadge.className,
                                                            )}
                                                        >
                                                            {sBadge.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge
                                                            className={cn('px-1.5 py-0 text-[10px]', classificationBadgeClass(ticket.classification))}
                                                        >
                                                            {classificationLabel(ticket.classification)}
                                                        </Badge>
                                                        <span className="text-muted-foreground text-xs">{ticket.channel}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="font-medium">{ticket.reporter_name || 'Anonim'}</span>
                                                        <span className="text-muted-foreground">{formatDate(ticket.created_at)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop: tabel */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-[180px]">Kode Tiket</TableHead>
                                                    <TableHead>Pelapor</TableHead>
                                                    <TableHead>Klasifikasi</TableHead>
                                                    <TableHead>Saluran</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Waktu Masuk</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentTickets.map((ticket) => {
                                                    const sBadge = statusBadge(ticket.status);
                                                    return (
                                                        <TableRow key={ticket.id}>
                                                            <TableCell className="font-mono text-xs font-medium">
                                                                <Link
                                                                    href={route('dashboard.admin.laporan-masuk.show', {
                                                                        ticketNumber: ticket.ticket_number,
                                                                    })}
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    {ticket.ticket_number}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className="text-xs font-medium">{ticket.reporter_name || 'Anonim'}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    className={cn(
                                                                        'px-1.5 py-0 text-[10px]',
                                                                        classificationBadgeClass(ticket.classification),
                                                                    )}
                                                                >
                                                                    {classificationLabel(ticket.classification)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-xs">{ticket.channel}</TableCell>
                                                            <TableCell>
                                                                <span
                                                                    className={cn(
                                                                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                                        sBadge.className,
                                                                    )}
                                                                >
                                                                    {sBadge.label}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-right text-xs">
                                                                {formatDate(ticket.created_at)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminPage>
    );
}