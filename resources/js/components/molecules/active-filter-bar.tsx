import { RotateCcw, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ActiveFilterItem {
    key: string;
    label: string;
    onRemove: () => void;
}

export function ActiveFilterBar({ items, onReset }: { items: ActiveFilterItem[]; onReset: () => void }) {
    if (items.length === 0) return null;

    return (
        <div className="bg-muted/30 flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs">
            <span className="text-muted-foreground font-medium">Filter aktif:</span>
            {items.map((item) => (
                <Badge key={item.key} variant="secondary" className="gap-1">
                    {item.label}
                    <button type="button" onClick={item.onRemove} aria-label={`Hapus filter ${item.label}`} className="hover:text-foreground">
                        <X className="size-3" />
                    </button>
                </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={onReset} className="h-6 px-2 text-xs">
                <RotateCcw className="mr-1 size-3" />
                Reset semua
            </Button>
        </div>
    );
}
