// resources/js/components/rekap/rekap-print-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

const TABLE_ROWS = 12;

export default function RekapPrintSkeleton() {
    return (
        <div className="space-y-6" role="status" aria-label="Memuat pratinjau">
            {/* Kop surat */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-20 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-80" />
                    <Skeleton className="h-3 w-72" />
                </div>
            </div>

            <Skeleton className="h-0.5 w-full" />

            {/* Judul */}
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* Tabel */}
            <div className="space-y-1.5">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: TABLE_ROWS }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                ))}
            </div>

            <Skeleton className="h-3 w-96" />
        </div>
    );
}
