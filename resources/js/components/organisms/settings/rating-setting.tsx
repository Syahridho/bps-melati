import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoaderCircle } from 'lucide-react';

interface RatingSettingProps {
    enabled: boolean;
    processing: boolean;
    onToggle: (checked: boolean) => void;
}

export default function RatingSetting({ enabled, processing, onToggle }: RatingSettingProps) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="space-y-0.5">
                <Label htmlFor="rating_enabled" className="text-sm font-medium">
                    Penilaian Pelapor
                </Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Minta pelapor memberi rating bintang (1-5) dan komentar opsional saat menutup laporan. Bila dimatikan, pelapor hanya melihat
                    konfirmasi penutupan seperti biasa. Penilaian yang sudah masuk tetap tersimpan dan tampil.
                </p>
            </div>

            <div className="flex items-center gap-2">
                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <Switch id="rating_enabled" checked={enabled} onCheckedChange={onToggle} disabled={processing} />
            </div>
        </div>
    );
}