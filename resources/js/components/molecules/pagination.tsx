import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface PaginationProps {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
    lastPage: number;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
}

type PageItem =
    | { type: 'prev'; url: string | null }
    | { type: 'next'; url: string | null }
    | { type: 'page'; label: string; url: string | null; active: boolean }
    | { type: 'ellipsis'; key: string };

function buildCompactLinks(links: PaginationLink[], lastPage: number): PageItem[] {
    const prev = links[0];
    const next = links[links.length - 1];
    const pages = links.slice(1, -1).filter((l) => /^\d+$/.test(l.label));

    const current = Number(pages.find((l) => l.active)?.label ?? 1);

    // Halaman yang ingin ditampilkan: pertama, terakhir, aktif, dan tetangganya
    const wanted = new Set<number>([1, lastPage, current - 1, current, current + 1]);
    const visible = [...wanted].filter((n) => n >= 1 && n <= lastPage).sort((a, b) => a - b);

    const items: PageItem[] = [{ type: 'prev', url: prev?.url ?? null }];

    visible.forEach((n, i) => {
        // Sisipkan ellipsis jika ada loncatan nomor
        if (i > 0 && n - visible[i - 1] > 1) {
            items.push({ type: 'ellipsis', key: `gap-${n}` });
        }
        const link = pages.find((l) => Number(l.label) === n);
        items.push({ type: 'page', label: String(n), url: link?.url ?? null, active: n === current });
    });

    items.push({ type: 'next', url: next?.url ?? null });
    return items;
}

function renderContent(item: Exclude<PageItem, { type: 'ellipsis' }>) {
    switch (item.type) {
        case 'prev':
            return <ChevronLeft className="h-4 w-4" />;
        case 'next':
            return <ChevronRight className="h-4 w-4" />;
        case 'page':
            return item.label;
    }
}

export function Pagination({ links, from, to, total, lastPage, perPage = 10, onPerPageChange }: PaginationProps) {
    if (total === 0) {
        return (
            <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-xs">
                <span>Tidak ada data</span>
            </div>
        );
    }

    return (
        <div className="text-muted-foreground flex flex-col gap-3 border-t px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
                <span>
                    Menampilkan <span className="text-foreground font-medium">{from ?? 0}</span> -{' '}
                    <span className="text-foreground font-medium">{to ?? 0}</span> dari <span className="text-foreground font-medium">{total}</span>{' '}
                    data
                </span>

                {onPerPageChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="hidden sm:inline">Per halaman:</span>
                        <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(Number(value))}>
                            <SelectTrigger className="h-7 w-16 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {lastPage > 1 && (
                <div className="flex flex-wrap items-center gap-1">
                    {buildCompactLinks(links, lastPage).map((item, index) => {
                        if (item.type === 'ellipsis') {
                            return (
                                <span key={item.key} className="text-muted-foreground inline-flex h-8 min-w-8 items-center justify-center text-xs">
                                    …
                                </span>
                            );
                        }

                        const content = renderContent(item);

                        if (!item.url) {
                            return (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="h-8 min-w-8 cursor-not-allowed px-2 text-xs opacity-40"
                                >
                                    {content}
                                </Button>
                            );
                        }

                        const active = item.type === 'page' && item.active;

                        return (
                            <Link
                                key={index}
                                href={item.url}
                                preserveState
                                preserveScroll
                                className={cn(
                                    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-foreground hover:bg-accent border-input',
                                )}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
