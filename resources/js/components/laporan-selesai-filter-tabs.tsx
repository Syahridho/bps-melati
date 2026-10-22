import { cn } from '@/lib/utils';
import { type FilterTab, type LaporanSelesaiProps } from '@/types/laporan-selesai';

interface LaporanSelesaiFilterTabsProps {
    currentFilter: FilterTab;
    counts: LaporanSelesaiProps['counts'];
    onFilterChange: (tab: FilterTab) => void;
}

export function LaporanSelesaiFilterTabs({ currentFilter, counts, onFilterChange }: LaporanSelesaiFilterTabsProps) {
    const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'pengaduan', label: 'Pengaduan', count: counts.pengaduan },
        { key: 'aspirasi', label: 'Aspirasi', count: counts.aspirasi },
        { key: 'permintaan', label: 'Permintaan Info', count: counts.permintaan },
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
