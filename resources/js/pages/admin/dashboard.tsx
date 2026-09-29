import { ChartAreaLinear, type TrendPoint } from '@/components/chart-area-linear';
import { ChartPieDonutText } from '@/components/chart-pie-donut-text';
import { ChartPieLabel } from '@/components/chart-pie-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileText,
    HelpCircle,
    Lightbulb,
    Mail,
    Megaphone,
    MessageSquare,
    Share2,
    ShieldAlert,
    Users,
} from 'lucide-react';
import { useState } from 'react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
type Range = 'today' | '7d' | '30d';
type ChannelKey = 'span_lapor' | 'sosial_media' | 'kunjungan_langsung' | 'wbs' | 'email';

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
    range: Range;
    stats: DashboardStats;
    trend: TrendPoint[];
    recentTickets: TicketSummary[];
}

const rangeOptions: { value: Range; label: string }[] = [
    { value: 'today', label: 'Hari Ini' },
    { value: '7d', label: '7 Hari Terakhir' },
    { value: '30d', label: '1 Bulan Terakhir' },
];

const channelCards: {
    key: ChannelKey;
    label: string;
    desc: string;
    icon: React.ElementType;
    card: string;
    iconWrap: string;
    text: string;
}[] = [
    {
        key: 'span_lapor',
        label: 'SP4N-LAPOR!',
        desc: 'Layanan aspirasi nasional',
        icon: Megaphone,
        card: 'border-rose-400/25 bg-rose-400/5',
        iconWrap: 'bg-rose-400/15 text-rose-500 dark:text-rose-400',
        text: 'text-rose-500 dark:text-rose-400',
    },
    {
        key: 'sosial_media',
        label: 'Sosial Media',
        desc: 'IG, Facebook, YouTube, WhatsApp',
        icon: Share2,
        card: 'border-violet-400/25 bg-violet-400/5',
        iconWrap: 'bg-violet-400/15 text-violet-500 dark:text-violet-400',
        text: 'text-violet-500 dark:text-violet-400',
    },
    {
        key: 'kunjungan_langsung',
        label: 'Kunjungan Langsung',
        desc: 'Pelayanan & kotak saran',
        icon: Users,
        card: 'border-emerald-400/25 bg-emerald-400/5',
        iconWrap: 'bg-emerald-400/15 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'wbs',
        label: 'WBS',
        desc: 'Whistleblowing system',
        icon: ShieldAlert,
        card: 'border-amber-300/40 bg-amber-300/5',
        iconWrap: 'bg-amber-300/20 text-amber-600 dark:text-amber-300',
        text: 'text-amber-600 dark:text-amber-300',
    },
    {
        key: 'email',
        label: 'Email',
        desc: 'Laporan via surel',
        icon: Mail,
        card: 'border-sky-400/25 bg-sky-400/5',
        iconWrap: 'bg-sky-400/15 text-sky-500 dark:text-sky-400',
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

export default function AdminDashboard({ range, stats, trend, recentTickets }: AdminDashboardProps) {
    const [loading, setLoading] = useState(false);
    const rangeLabel = rangeOptions.find((o) => o.value === range)?.label ?? '';

    const handleRangeChange = (value: string) => {
        router.get(
            route('dashboard.admin.index'),
            { range: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['range', 'stats', 'trend', 'recentTickets'],
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <AdminPage
            // title="Dashboard Admin"
            // description="Ringkasan rekapitulasi penanganan pengaduan, aspirasi, dan konsultasi BPS Provinsi Riau"
            breadcrumbs={[{ title: 'Dashboard Admin', href: route('dashboard.admin.index') }]}
        >
            <div className="space-y-6">
                {/* Filter periode */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold">PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU </h2>
                        <p className="text-xs text-muted-foreground">Menampilkan data: {rangeLabel}</p>
                    </div>
                    <Select value={range} onValueChange={handleRangeChange}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Pilih periode" />
                        </SelectTrigger>
                        <SelectContent>
                            {rangeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={cn('space-y-6 transition-opacity', loading && 'pointer-events-none opacity-60')}>
                    {/* Kartu klasifikasi */}CardFooter
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Total</CardTitle>
                                <FileText className="h-5 w-5 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.total}</div>
                                <p className="mt-1 text-xs text-muted-foreground">Keseluruhan laporan yang diterima</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-destructive/20 bg-destructive/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-destructive">Pengaduan</CardTitle>
                                <AlertCircle className="h-5 w-5 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-destructive">{stats.pengaduan}</div>
                                <Badge variant="destructive" className="mt-1 px-1.5 py-0 text-[10px]">
                                    Laporan Masalah
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card className="border border-primary/20 bg-primary/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-primary">Aspirasi</CardTitle>
                                <Lightbulb className="h-5 w-5 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-primary">{stats.aspirasi}</div>
                                <Badge variant="default" className="mt-1 px-1.5 py-0 text-[10px]">
                                    Saran & Masukan
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card className="border border-indigo-500/20 bg-indigo-500/5 shadow-xs transition-shadow hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Permintaan Informasi</CardTitle>
                                <HelpCircle className="h-5 w-5 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.permintaan_informasi}</div>
                                <Badge variant="secondary" className="mt-1 px-1.5 py-0 text-[10px]">
                                    Permohonan Data
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kartu kanal */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {channelCards.map(({ key, label, desc, icon: Icon, card, iconWrap, text }) => {
                            const value = stats[key] ?? 0;

                            return (
                                <Card key={key} className={cn('border shadow-xs transition-shadow hover:shadow-sm', card)}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className={cn('text-sm font-medium', text)}>{label}</CardTitle>
                                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', iconWrap)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={cn('text-3xl font-bold', text)}>{value}</div>
                                        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pie charts */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <ChartPieDonutText stats={stats} />
                        <ChartPieLabel stats={stats} />
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card className="border border-amber-500/30 bg-amber-500/5">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Belum Dibalas (Baru)</p>
                                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.baru}</p>
                                </div>
                                <Clock className="h-8 w-8 text-amber-500 opacity-80" />
                            </CardContent>
                        </Card>

                        <Card className="border border-blue-500/30 bg-blue-500/5">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Dalam Proses Respon</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.respon_awal + stats.respon_substantif}</p>
                                </div>
                                <MessageSquare className="h-8 w-8 text-blue-500 opacity-80" />
                            </CardContent>
                        </Card>

                        <Card className="border border-emerald-500/30 bg-emerald-500/5">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Telah Selesai</p>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.selesai}</p>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tren */}
                    <ChartAreaLinear data={trend} periodLabel={rangeLabel} />

                    {/* Laporan terbaru */}
                    <Card className="border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                            <div>
                                <CardTitle className="text-base font-bold">Laporan Terbaru Masuk</CardTitle>
                                <CardDescription className="text-xs">
                                    Daftar 7 laporan atau konsultasi terbaru pada periode: {rangeLabel}
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
                                <div className="py-8 text-center text-xs text-muted-foreground">Belum ada laporan pada periode ini.</div>
                            ) : (
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
                                                            href={route('dashboard.admin.laporan-masuk.show', { ticketNumber: ticket.ticket_number })}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {ticket.ticket_number}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">{ticket.reporter_name || 'Anonim'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={classificationBadgeVariant(ticket.classification)} className="px-1.5 py-0 text-[10px]">
                                                            {classificationLabel(ticket.classification)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{ticket.channel}</TableCell>
                                                    <TableCell>
                                                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', sBadge.className)}>
                                                            {sBadge.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(ticket.created_at)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminPage>
    );
}