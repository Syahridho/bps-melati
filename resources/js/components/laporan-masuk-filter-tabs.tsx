import { cn } from '@/lib/utils';
import { type FilterTab, type LaporanMasukProps } from '@/types/laporan-masuk';

interface LaporanMasukFilterTabsProps {
    currentFilter: FilterTab;
    counts: LaporanMasukProps['counts'];
    onFilterChange: (tab: FilterTab) => void;
}

export function LaporanMasukFilterTabs({ currentFilter, counts, onFilterChange }: LaporanMasukFilterTabsProps) {
    const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'belum_dibaca', label: 'Belum Dibaca', count: counts.belum_dibaca },
        { key: 'pengaduan', label: 'Pengaduan', count: counts.pengaduan },
        { key: 'aspirasi', label: 'Aspirasi', count: counts.aspirasi },
        { key: 'permintaan', label: 'Permintaan Info', count: counts.permintaan },
        { key: 'respon_awal', label: 'Respon Awal', count: counts.respon_awal },
        { key: 'respon_substantif', label: 'Respon Substantif', count: counts.respon_substantif },
    ];

    return (
        <div className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2">
            {filterTabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onFilterChange(tab.key)}
                    className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        currentFilter === tab.key
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span
                            className={cn(
                                'inline-flex size-5 items-center justify-center rounded-full text-[10px]',
                                currentFilter === tab.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20',
                            )}
                        >
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
