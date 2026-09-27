import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock,
    FilePlus2,
    FileText,
    HelpCircle,
    Inbox,
    Lightbulb,
    MessageSquare,
    Users,
} from 'lucide-react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

interface DashboardStats {
    total: number;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
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
    recentTickets: TicketSummary[];
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

export default function AdminDashboard({ stats, recentTickets }: AdminDashboardProps) {
    const marqueeText = `PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU  —  JUMLAH TOTAL: ${stats.total} LAPORAN  |  PENGADUAN: ${stats.pengaduan}  |  ASPIRASI: ${stats.aspirasi}  |  PERMINTAAN INFORMASI: ${stats.permintaan_informasi}`;

    return (
        <AdminPage
            title="Dashboard Admin"
            description="Ringkasan rekapitulasi penanganan pengaduan, aspirasi, dan konsultasi BPS Provinsi Riau"
            breadcrumbs={[{ title: 'Dashboard Admin', href: route('dashboard.admin.index') }]}
        >
            <div className="space-y-6">
                {/* Marquee Running Text Banner */}
                <div className="relative flex items-center overflow-hidden rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-primary shadow-xs">
                    <div className="flex shrink-0 items-center gap-2 pr-4 font-semibold text-xs uppercase tracking-wider border-r border-primary/20">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                        <span>Info Berjalan</span>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {/* Native smooth scrolling marquee for running title */}
                        <marquee behavior="scroll" direction="left" scrollamount="6" className="font-bold text-sm tracking-wide">
                            {marqueeText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {marqueeText}
                        </marquee>
                    </div>
                </div>

                {/* Main Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Card */}
                    <Card className="border shadow-xs hover:shadow-sm transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Total</CardTitle>
                            <FileText className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">Keseluruhan laporan yang diterima</p>
                        </CardContent>
                    </Card>

                    {/* Pengaduan Card */}
                    <Card className="border shadow-xs hover:shadow-sm transition-shadow border-destructive/20 bg-destructive/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Pengaduan</CardTitle>
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-destructive">{stats.pengaduan}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Laporan Masalah
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Aspirasi Card */}
                    <Card className="border shadow-xs hover:shadow-sm transition-shadow border-primary/20 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-primary">Aspirasi</CardTitle>
                            <Lightbulb className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">{stats.aspirasi}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                    Saran & Masukan
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permintaan Informasi Card */}
                    <Card className="border shadow-xs hover:shadow-sm transition-shadow border-indigo-500/20 bg-indigo-500/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Permintaan Informasi</CardTitle>
                            <HelpCircle className="h-5 w-5 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.permintaan_informasi}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Permohonan Data
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary Status Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                {/* Quick Action Navigation Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button asChild variant="outline" className="h-auto py-3 flex-col items-center justify-center gap-1.5 border shadow-xs">
                        <Link href={route('dashboard.admin.laporan-masuk.index')}>
                            <Inbox className="h-5 w-5 text-primary" />
                            <span className="text-xs font-semibold">Laporan Masuk</span>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-auto py-3 flex-col items-center justify-center gap-1.5 border shadow-xs">
                        <Link href={route('dashboard.admin.input-data.index')}>
                            <FilePlus2 className="h-5 w-5 text-primary" />
                            <span className="text-xs font-semibold">Input Data Baru</span>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-auto py-3 flex-col items-center justify-center gap-1.5 border shadow-xs">
                        <Link href={route('dashboard.admin.laporan-selesai.index')}>
                            <ClipboardList className="h-5 w-5 text-primary" />
                            <span className="text-xs font-semibold">Laporan Selesai</span>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-auto py-3 flex-col items-center justify-center gap-1.5 border shadow-xs">
                        <Link href={route('dashboard.admin.operator.index')}>
                            <Users className="h-5 w-5 text-primary" />
                            <span className="text-xs font-semibold">Kelola Operator</span>
                        </Link>
                    </Button>
                </div>

                {/* Recent Reports Table */}
                <Card className="border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                        <div>
                            <CardTitle className="text-base font-bold">Laporan Terbaru Masuk</CardTitle>
                            <CardDescription className="text-xs">Daftar 7 laporan atau konsultasi terbaru yang tercatat di sistem</CardDescription>
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
                            <div className="py-8 text-center text-xs text-muted-foreground">Belum ada laporan yang tercatat.</div>
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
                                                <TableCell className="font-mono font-medium text-xs">
                                                    <Link
                                                        href={route('dashboard.admin.laporan-masuk.show', { ticketNumber: ticket.ticket_number })}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {ticket.ticket_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">{ticket.reporter_name || 'Anonim'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={classificationBadgeVariant(ticket.classification)} className="text-[10px] px-1.5 py-0">
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
        </AdminPage>
    );
}
