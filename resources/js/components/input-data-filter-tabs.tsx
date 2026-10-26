import { ScrollableTabs } from '@/components/scrollable-tabs';
import { cn } from '@/lib/utils';
import { type FilterTab } from '@/types/input-data';

interface InputDataFilterTabsProps {
    currentFilter: FilterTab;
    counts: {
        semua: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
    };
    onFilterChange: (tab: FilterTab) => void;
}

export function InputDataFilterTabs({ currentFilter, counts, onFilterChange }: InputDataFilterTabsProps) {
    const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'pengaduan', label: 'Pengaduan', count: counts.pengaduan },
        { key: 'aspirasi', label: 'Aspirasi', count: counts.aspirasi },
        { key: 'permintaan', label: 'Permintaan Info', count: counts.permintaan },
    ];

    return (
        <ScrollableTabs activeIndex={filterTabs.findIndex((tab) => tab.key === currentFilter)} ariaLabel="Filter input data">
            {filterTabs.map((tab) => (
                <button
                    key={tab.key}
                    aria-pressed={currentFilter === tab.key}
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
        </ScrollableTabs>
    );
}

export { InputDataFilterTabs as FilterTabs };
