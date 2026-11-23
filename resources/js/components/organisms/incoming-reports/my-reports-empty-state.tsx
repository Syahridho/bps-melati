import { Link } from '@inertiajs/react';

interface MyReportsEmptyStateProps {
    hasActiveFilters: boolean;
    assignmentMode: string;
    incomingHref: string;
}

export function MyReportsEmptyState({ hasActiveFilters, assignmentMode, incomingHref }: MyReportsEmptyStateProps) {
    if (hasActiveFilters) {
        return <p className="text-sm">Tidak ada laporan yang cocok dengan filter.</p>;
    }

    if (assignmentMode === 'free') {
        return (
            <>
                <p className="text-sm">Belum ada laporan yang Anda tangani.</p>
                <p className="max-w-md text-xs">
                    Pada mode keroyokan (free), laporan tidak memiliki penanggung jawab (PIC), sehingga daftar ini bisa kosong.
                </p>
            </>
        );
    }

    return (
        <>
            <p className="text-sm">Belum ada laporan yang Anda tangani.</p>
            <Link href={incomingHref} className="text-primary text-xs font-medium hover:underline">
                Ambil tiket di Laporan Masuk
            </Link>
        </>
    );
}
