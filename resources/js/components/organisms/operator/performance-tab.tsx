import { DateRangeFilter } from '@/components/molecules/date-range-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PerformanceOperator {
    id: number;
    name: string;
    role: string;
    is_active: boolean;
    is_deleted: boolean;
    completed: number;
    in_progress: number;
    rating: number | null;
    rating_count: number;
    meets_min_ratings: boolean;
    avg_duration_seconds: number | null;
    avg_duration_human: string;
}

interface SummaryItem {
    id: number;
    name: string;
    value: number;
}

interface BestRatingItem extends SummaryItem {
    count: number;
}

interface PerformanceData {
    operators: PerformanceOperator[];
    summary: {
        most_completed: SummaryItem | null;
        most_in_progress: SummaryItem | null;
        best_rating: BestRatingItem | null;
    };
    totals: {
        counted_tickets: number;
        excluded_without_pic: number;
    };
    meta: {
        min_ratings: number;
        mode: string;
        from: string;
        to: string;
        sort: string;
        direction: string;
    };
}

interface PerformanceTabProps {
    active: boolean;
}

const PERFORMANCE_MODES = ['gabungan', 'selesai', 'otomatis'] as const;
type PerformanceMode = (typeof PERFORMANCE_MODES)[number];
const DEFAULT_PERFORMANCE_MODE: PerformanceMode = 'gabungan';

const MODE_OPTIONS: Array<{ value: PerformanceMode; label: string; description: string }> = [
    {
        value: 'gabungan',
        label: 'Gabungan',
        description: 'Semua tiket selesai (ditutup otomatis maupun non-otomatis)',
    },
    {
        value: 'selesai',
        label: 'Selesai',
        description: 'Hanya tiket yang ditutup non-otomatis (oleh pelapor atau staf)',
    },
    {
        value: 'otomatis',
        label: 'Otomatis',
        description: 'Hanya tiket yang ditutup otomatis oleh sistem',
    },
];

function resolveInitialMode(): PerformanceMode {
    if (typeof window === 'undefined') return DEFAULT_PERFORMANCE_MODE;
    const raw = new URLSearchParams(window.location.search).get('mode')?.toLowerCase() ?? '';
    return (PERFORMANCE_MODES as readonly string[]).includes(raw) ? (raw as PerformanceMode) : DEFAULT_PERFORMANCE_MODE;
}

export default function OperatorPerformanceTab({ active }: PerformanceTabProps) {
    const [from, setFrom] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [to, setTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [mode, setMode] = useState<PerformanceMode>(() => resolveInitialMode());

    const handleModeChange = (nextValue: string) => {
        if (!nextValue || !(PERFORMANCE_MODES as readonly string[]).includes(nextValue)) {
            return;
        }
        const nextMode = nextValue as PerformanceMode;
        setMode(nextMode);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', nextMode);
            window.history.replaceState({}, '', url.toString());
        }
    };
    const [sort, setSort] = useState<string>('completed');
    const [direction, setDirection] = useState<string>('desc');
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const hasLoadedRef = useRef<boolean>(false);

    const fetchData = async (override?: { refresh?: boolean }) => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('from', from);
        params.set('to', to);
        params.set('mode', mode);
        params.set('sort', sort);
        params.set('direction', direction);
        if (override?.refresh) {
            params.set('refresh', '1');
        }

        try {
            const response = await fetch(`${route('dashboard.admin.operator.performance')}?${params.toString()}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Anda tidak memiliki akses ke data kinerja.');
                }
                throw new Error('Gagal memuat data kinerja.');
            }

            const json = (await response.json()) as PerformanceData;
            setData(json);
            hasLoadedRef.current = true;
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                return;
            }
            setError((err as Error).message || 'Gagal memuat data kinerja.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!active) return;
        if (hasLoadedRef.current) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    useEffect(() => {
        if (!active || !hasLoadedRef.current) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [from, to, mode, sort, direction]);

    const handleSort = (column: string) => {
        if (sort === column) {
            setDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
        } else {
            setSort(column);
            setDirection('desc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sort !== column) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-50" />;
        return direction === 'desc'
            ? <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
            : <ArrowUp className="ml-1 inline h-3.5 w-3.5" />;
    };

    const renderStars = (rating: number | null) => {
        if (rating === null) return null;
        const full = Math.round(rating);
        return (
            <span className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i <= full ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`}
                    />
                ))}
            </span>
        );
    };

    const showSkeleton = loading && !data;

    return (
        <div className="space-y-6">
            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <DateRangeFilter from={from} to={to} onRangeChange={(f, t) => {
                    setFrom(f ?? from);
                    setTo(t ?? to);
                }} />
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <ToggleGroup
                            type="single"
                            value={mode}
                            onValueChange={handleModeChange}
                            aria-label="Mode perhitungan kinerja"
                            className="bg-muted/40 border-border rounded-lg border p-1"
                        >
                            {MODE_OPTIONS.map((option) => (
                                <Tooltip key={option.value}>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex">
                                            <ToggleGroupItem
                                                value={option.value}
                                                size="sm"
                                                aria-label={option.label}
                                                title={option.description}
                                                className="text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:font-semibold data-[state=on]:shadow-xs"
                                            >
                                                {option.label}
                                            </ToggleGroupItem>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{option.description}</TooltipContent>
                                </Tooltip>
                            ))}
                        </ToggleGroup>
                    </TooltipProvider>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchData({ refresh: true })}
                        disabled={loading}
                        aria-label="Muat ulang"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            {showSkeleton ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="mt-2 h-4 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Paling banyak selesai</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold">
                                {data?.summary.most_completed?.name ?? '-'}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {data?.summary.most_completed ? `${data.summary.most_completed.value} tiket` : 'Belum ada data'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Paling banyak diproses saat ini</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold">
                                {data?.summary.most_in_progress?.name ?? '-'}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {data?.summary.most_in_progress ? `${data.summary.most_in_progress.value} tiket` : 'Belum ada data'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Rating terbaik</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold">
                                {data?.summary.best_rating?.name ?? '-'}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {data?.summary.best_rating
                                    ? `${data.summary.best_rating.value} dari ${data.summary.best_rating.count} penilaian`
                                    : 'Belum ada data'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchData({ refresh: true })}>
                        Coba lagi
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">No</TableHead>
                            <TableHead>
                                <button type="button" className="inline-flex items-center" onClick={() => handleSort('name')}>
                                    Operator <SortIcon column="name" />
                                </button>
                            </TableHead>
                            <TableHead className="text-right">
                                <button type="button" className="inline-flex items-center" onClick={() => handleSort('completed')}>
                                    Selesai <SortIcon column="completed" />
                                </button>
                            </TableHead>
                            <TableHead className="text-right">
                                <button type="button" className="inline-flex items-center" onClick={() => handleSort('in_progress')}>
                                    Sedang Diproses <SortIcon column="in_progress" />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button type="button" className="inline-flex items-center" onClick={() => handleSort('rating')}>
                                    Rating <SortIcon column="rating" />
                                </button>
                            </TableHead>
                            <TableHead className="text-right">
                                <button type="button" className="inline-flex items-center" onClick={() => handleSort('duration')}>
                                    Rata-rata Durasi <SortIcon column="duration" />
                                </button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {showSkeleton ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={`sk-${i}`}>
                                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                                </TableRow>
                            ))
                        ) : data && data.operators.length > 0 ? (
                            data.operators.map((op, idx) => (
                                <TableRow key={op.id}>
                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{op.name}</span>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge variant={op.role === 'operator_tim' ? 'outline' : 'secondary'} className="capitalize text-[10px]">
                                                    {op.role === 'operator_tim' ? 'Operator Tim' : op.role}
                                                </Badge>
                                                {(!op.is_active || op.is_deleted) && (
                                                    <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>
                                                )}
                                                {!op.meets_min_ratings && op.rating_count > 0 && (
                                                    <Badge variant="outline" className="text-[10px]">Penilaian belum cukup</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{op.completed}</TableCell>
                                    <TableCell className="text-right font-medium">{op.in_progress}</TableCell>
                                    <TableCell>
                                        {op.rating === null ? (
                                            <span className="text-muted-foreground text-xs">Belum ada penilaian</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {renderStars(op.rating)}
                                                <span className="text-sm">
                                                    {op.rating} ({op.rating_count})
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">{op.avg_duration_human}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                    Belum ada data kinerja pada periode ini
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer notes */}
            {data && (
                <div className="text-muted-foreground space-y-1 text-xs">
                    <p>
                        {data.totals.excluded_without_pic > 0
                            ? `${data.totals.excluded_without_pic} tiket selesai pada periode ini tidak memiliki penanggung jawab dan tidak dihitung.`
                            : 'Semua tiket selesai pada periode ini memiliki penanggung jawab.'}
                    </p>
                    <p>Kolom "Sedang Diproses" menunjukkan kondisi saat ini dan tidak terpengaruh filter waktu.</p>
                    <p>Peringkat rating memerlukan minimal {data.meta.min_ratings} penilaian.</p>
                    <p>Total tiket yang dihitung: {data.totals.counted_tickets}.</p>
                </div>
            )}
        </div>
    );
}