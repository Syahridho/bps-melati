import { cn } from '@/lib/utils';
import { type FilterTab, type LaporanMasukProps } from '@/types/laporan-masuk';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
        { key: 'ditandai', label: 'Ditandai', count: counts.ditandai },
        { key: 'berkadar_pengawasan', label: 'Berkadar Pengawasan', count: counts.berkadar_pengawasan },
    ];

    const containerRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const isFirstRender = useRef(true);

    const [showLeftGradient, setShowLeftGradient] = useState(false);
    const [showRightGradient, setShowRightGradient] = useState(false);

    const checkScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setShowLeftGradient(scrollLeft > 4);
        setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 4);
    };

    useEffect(() => {
        checkScroll();
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => checkScroll();
        el.addEventListener('scroll', handleScroll, { passive: true });

        const resizeObserver = new ResizeObserver(() => checkScroll());
        resizeObserver.observe(el);

        return () => {
            el.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
        };
    }, []);

    // Auto-scroll active tab into view
    useEffect(() => {
        const activeTab = tabRefs.current[currentFilter];
        if (activeTab && containerRef.current) {
            activeTab.scrollIntoView({
                inline: 'center',
                block: 'nearest',
                behavior: isFirstRender.current ? 'auto' : 'smooth',
            });
        }
        isFirstRender.current = false;
    }, [currentFilter]);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        if (el && e.deltaY !== 0 && e.deltaX === 0) {
            el.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    const scrollByAmount = (amount: number) => {
        const el = containerRef.current;
        if (el) {
            el.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let nextIndex = index;
        if (e.key === 'ArrowRight') {
            nextIndex = (index + 1) % filterTabs.length;
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            nextIndex = (index - 1 + filterTabs.length) % filterTabs.length;
            e.preventDefault();
        } else if (e.key === 'Home') {
            nextIndex = 0;
            e.preventDefault();
        } else if (e.key === 'End') {
            nextIndex = filterTabs.length - 1;
            e.preventDefault();
        }
        if (nextIndex !== index) {
            const nextKey = filterTabs[nextIndex].key;
            onFilterChange(nextKey);
            tabRefs.current[nextKey]?.focus();
        }
    };

    return (
        <div className="relative border-b">
            {/* Left fade gradient & scroll button */}
            <div
                className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-background via-background/80 to-transparent px-1 transition-opacity duration-200',
                    showLeftGradient ? 'opacity-100' : 'opacity-0',
                )}
            >
                <button
                    type="button"
                    onClick={() => scrollByAmount(-200)}
                    className="pointer-events-auto hidden h-7 w-7 items-center justify-center rounded-full border bg-background shadow-xs hover:bg-muted md:flex"
                    aria-label="Geser ke kiri"
                >
                    <ChevronLeft className="size-4" />
                </button>
            </div>

            {/* Right fade gradient & scroll button */}
            <div
                className={cn(
                    'pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-background via-background/80 to-transparent px-1 transition-opacity duration-200',
                    showRightGradient ? 'opacity-100' : 'opacity-0',
                )}
            >
                <button
                    type="button"
                    onClick={() => scrollByAmount(200)}
                    className="pointer-events-auto hidden h-7 w-7 items-center justify-center rounded-full border bg-background shadow-xs hover:bg-muted md:flex"
                    aria-label="Geser ke kanan"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>

            {/* Tabs Container */}
            <div
                ref={containerRef}
                role="tablist"
                aria-label="Filter Laporan Masuk"
                onWheel={handleWheel}
                className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {filterTabs.map((tab, index) => {
                    const isActive = currentFilter === tab.key;
                    const count = tab.count ?? 0;
                    const isBerkadar = tab.key === 'berkadar_pengawasan';

                    return (
                        <button
                            key={tab.key}
                            ref={(el) => { tabRefs.current[tab.key] = el; }}
                            role="tab"
                            aria-selected={isActive}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => onFilterChange(tab.key)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span
                                    className={cn(
                                        'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold transition-transform',
                                        isActive
                                            ? 'bg-primary-foreground/25 text-primary-foreground'
                                            : count > 0
                                              ? isBerkadar
                                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                                  : 'bg-muted-foreground/15 text-foreground'
                                              : 'bg-muted/50 text-muted-foreground/60',
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
