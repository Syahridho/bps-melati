import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
    currentPage: number;
    lastPage: number;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
}

export function Pagination({
    links,
    from,
    to,
    total,
    currentPage,
    lastPage,
    perPage = 10,
    onPerPageChange,
}: PaginationProps) {
    if (total === 0) {
        return (
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Tidak ada data</span>
            </div>
        );
    }

    const cleanLabel = (label: string) => {
        if (label.includes('&laquo;') || label.includes('Previous') || label.includes('Sebelumnya')) {
            return <ChevronLeft className="h-4 w-4" />;
        }
        if (label.includes('&raquo;') || label.includes('Next') || label.includes('Berikutnya')) {
            return <ChevronRight className="h-4 w-4" />;
        }
        return label;
    };

    return (
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
                <span>
                    Menampilkan <span className="font-medium text-foreground">{from ?? 0}</span> -{' '}
                    <span className="font-medium text-foreground">{to ?? 0}</span> dari{' '}
                    <span className="font-medium text-foreground">{total}</span> data
                </span>

                {onPerPageChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="hidden sm:inline">Per halaman:</span>
                        <Select
                            value={String(perPage)}
                            onValueChange={(value) => onPerPageChange(Number(value))}
                        >
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
                    {links.map((link, index) => {
                        if (!link.url) {
                            return (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="h-8 min-w-8 px-2 text-xs opacity-40 cursor-not-allowed"
                                >
                                    {cleanLabel(link.label)}
                                </Button>
                            );
                        }

                        return (
                            <Link
                                key={index}
                                href={link.url}
                                preserveState
                                preserveScroll
                                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors border ${
                                    link.active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-foreground hover:bg-accent border-input'
                                }`}
                            >
                                {cleanLabel(link.label)}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
