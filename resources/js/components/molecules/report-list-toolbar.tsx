import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { DateRangeFilter } from '@/components/molecules/date-range-filter';
import { Input } from '@/components/ui/input';

interface ReportListToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    from?: string | null;
    to?: string | null;
    onRangeChange: (from: string | null, to: string | null) => void;
    channelFilter?: ReactNode;
    actions?: ReactNode;
}

export function ReportListToolbar({ search, onSearchChange, from, to, onRangeChange, channelFilter, actions }: ReportListToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="relative min-w-[12rem] flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input placeholder="Cari laporan..." className="pl-9" value={search} onChange={(e) => onSearchChange(e.target.value)} />
            </div>
            {channelFilter}
            <DateRangeFilter from={from} to={to} onRangeChange={onRangeChange} />
            {actions}
        </div>
    );
}
