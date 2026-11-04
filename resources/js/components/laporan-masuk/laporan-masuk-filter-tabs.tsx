import { ScrollableTabs } from '@/components/shared/scrollable-tabs';
import { cn, formatCount } from '@/lib/utils';
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
        { key: 'berkadar_pengawasan', label: 'Berkadar Pengawasan', count: counts.berkadar_pengawasan },
        { key: 'ditandai', label: 'Ditandai', count: counts.ditandai },
    ];

    return (
        <ScrollableTabs activeIndex={filterTabs.findIndex((tab) => tab.key === currentFilter)} ariaLabel="Filter laporan masuk">
            {filterTabs.map((tab) => {
                const countInfo = tab.count !== undefined ? formatCount(tab.count) : null;
                const isShortened = countInfo ? countInfo.formatted !== countInfo.full : false;

                return (
                    <button
                        key={tab.key}
                        aria-pressed={currentFilter === tab.key}
                        onClick={() => onFilterChange(tab.key)}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                            currentFilter === tab.key
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <span>{tab.label}</span>
                        {countInfo !== null && (
                            <span
                                title={isShortened ? `${countInfo.full} (${tab.label})` : undefined}
                                className={cn(
                                    'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] leading-none font-semibold whitespace-nowrap tabular-nums transition-colors',
                                    currentFilter === tab.key
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-muted text-muted-foreground group-hover:text-foreground dark:bg-muted/80',
                                )}
                            >
                                {countInfo.formatted}
                            </span>
                        )}
                    </button>
                );
            })}
        </ScrollableTabs>
    );
}
