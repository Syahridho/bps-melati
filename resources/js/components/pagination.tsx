import { Link } from '@inertiajs/react';
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
    lastPage: number;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
}

export function Pagination({ links, from, to, total, lastPage, perPage = 10, onPerPageChange }: PaginationProps) {
    if (total === 0) {
        return (
            <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-xs">
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
                    {links.map((link, index) => {
                        if (!link.url) {
                            return (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="h-8 min-w-8 cursor-not-allowed px-2 text-xs opacity-40"
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
                                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors ${
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
