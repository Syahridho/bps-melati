import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type DashboardStats } from '@/types/dashboard';
import { AlertCircle, FileText, HelpCircle, Lightbulb } from 'lucide-react';

interface DashboardStatCardsProps {
    stats: DashboardStats;
}

export function DashboardStatCards({ stats }: DashboardStatCardsProps) {
    return (
        <div>
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
                        <CardTitle className="text-sm leading-tight font-medium text-indigo-600 dark:text-indigo-400">Permintaan Informasi</CardTitle>
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
        </div>
    );
}
