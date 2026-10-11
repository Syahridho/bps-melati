import { Card, CardContent } from '@/components/ui/card';
import { type DashboardStats } from '@/types/dashboard';
import { CheckCircle2, Clock, MessageSquare } from 'lucide-react';

interface DashboardStatusCardsProps {
    stats: DashboardStats;
}

export function DashboardStatusCards({ stats }: DashboardStatusCardsProps) {
    return (
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
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.respon_awal + stats.respon_substantif}</p>
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
    );
}
