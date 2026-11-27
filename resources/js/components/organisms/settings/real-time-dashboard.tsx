import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoaderCircle } from 'lucide-react';

interface RealTimeDashboardProps {
    enabled: boolean;
    processing: boolean;
    onToggle: (checked: boolean) => void;
}

export default function RealTimeDashboard({ enabled, processing, onToggle }: RealTimeDashboardProps) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="space-y-0.5">
                <Label htmlFor="dashboard_live_enabled" className="text-sm font-medium">
                    Live Dashboard
                </Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Aktifkan pembaruan data real-time via WebSocket khusus untuk halaman Dashboard admin & operator. Pengaturan ini tidak
                    memengaruhi halaman Input Data maupun daftar laporan lainnya (tetap live).
                </p>
            </div>

            <div className="flex items-center gap-2">
                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <Switch id="dashboard_live_enabled" checked={enabled} onCheckedChange={onToggle} disabled={processing} />
            </div>
        </div>
    );
}
