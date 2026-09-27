import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, FileText, HelpCircle, Lightbulb } from 'lucide-react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

interface DashboardStats {
    total: number;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
    baru: number;
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

interface OperatorDashboardProps {
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

export default function OperatorDashboard({ stats, recentTickets }: OperatorDashboardProps) {
    const marqueeText = `PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU  —  JUMLAH TOTAL: ${stats.total} LAPORAN  |  PENGADUAN: ${stats.pengaduan}  |  ASPIRASI: ${stats.aspirasi}  |  PERMINTAAN INFORMASI: ${stats.permintaan_informasi}`;

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard Operator', href: route('dashboard.operator.index') }]}>
            <Head title="Dashboard Operator" />
            <div className="px-4 py-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard Operator</h1>
                    <p className="text-sm text-muted-foreground">Ringkasan statistik penanganan pengaduan & konsultasi BPS Provinsi Riau</p>
                </div>

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
                        <marquee behavior="scroll" direction="left" scrollamount="6" className="font-bold text-sm tracking-wide">
                            {marqueeText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {marqueeText}
                        </marquee>
                    </div>
                </div>

                {/* Main Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Card */}
                    <Card className="border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Total</CardTitle>
                            <FileText className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">Seluruh laporan tercatat</p>
                        </CardContent>
                    </Card>

                    {/* Pengaduan Card */}
                    <Card className="border shadow-xs border-destructive/20 bg-destructive/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Pengaduan</CardTitle>
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-destructive">{stats.pengaduan}</div>
                            <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                                Laporan Pengaduan
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Aspirasi Card */}
                    <Card className="border shadow-xs border-primary/20 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-primary">Aspirasi</CardTitle>
                            <Lightbulb className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">{stats.aspirasi}</div>
                            <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0">
                                Saran / Masukan
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Permintaan Informasi Card */}
                    <Card className="border shadow-xs border-indigo-500/20 bg-indigo-500/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Permintaan Informasi</CardTitle>
                            <HelpCircle className="h-5 w-5 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.permintaan_informasi}</div>
                            <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                                Permohonan Data
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary Status Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border border-amber-500/30 bg-amber-500/5">
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Laporan Belum Dibalas</p>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.baru}</p>
                            </div>
                            <Clock className="h-8 w-8 text-amber-500 opacity-80" />
                        </CardContent>
                    </Card>

                    <Card className="border border-emerald-500/30 bg-emerald-500/5">
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Laporan Telah Selesai</p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.selesai}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Reports List Table */}
                <Card className="border shadow-xs">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-bold">Ringkasan Laporan Terbaru</CardTitle>
                        <CardDescription className="text-xs">Monitoring 7 laporan terbaru di sistem BPS Melati</CardDescription>
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
                                        <TableHead className="text-right">Waktu Masuk</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-mono font-medium text-xs">{ticket.ticket_number}</TableCell>
                                            <TableCell className="text-xs font-medium">{ticket.reporter_name || 'Anonim'}</TableCell>
                                            <TableCell>
                                                <Badge variant={classificationBadgeVariant(ticket.classification)} className="text-[10px] px-1.5 py-0">
                                                    {classificationLabel(ticket.classification)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{ticket.channel}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">{formatDate(ticket.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
