import { type ReplyConflict } from '@/types/laporan-masuk';
import { AlertTriangle } from 'lucide-react';

interface ConflictBannerProps {
    conflict: ReplyConflict;
    /** Dipakai untuk mengarahkan pengguna langsung ke aksi lanjutan (ubah jenis balasan). */
    onUseSubstantif?: () => void;
}

/**
 * Banner 409: orang lain sudah memberi Respon Awal lebih dulu.
 * Draft pengguna sengaja tidak dihapus — hanya jenis tanggapan yang disiapkan ulang.
 */
export function LaporanMasukConflictBanner({ conflict, onUseSubstantif }: ConflictBannerProps) {
    const respondedAt = conflict.responded_at
        ? new Date(conflict.responded_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
        : null;

    return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                    <p className="font-medium">{conflict.message}</p>
                    {conflict.responded_by && respondedAt && (
                        <p className="text-xs opacity-80">
                            {conflict.responded_by} — {respondedAt}
                        </p>
                    )}
                    {onUseSubstantif && (
                        <button
                            type="button"
                            onClick={onUseSubstantif}
                            className="text-xs font-semibold underline underline-offset-2 hover:no-underline"
                        >
                            Lanjutkan sebagai Respon Substantif
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export { LaporanMasukConflictBanner as ConflictBanner };
