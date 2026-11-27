import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type LucideIcon, MoreHorizontal } from 'lucide-react';

export interface RowActionItem {
    label: string;
    icon?: LucideIcon;
    onSelect: () => void;
    variant?: 'default' | 'destructive' | 'warning';
    disabled?: boolean;
    hidden?: boolean;
    disabledReason?: string;
}

interface RowActionsMenuProps {
    items: RowActionItem[];
    triggerLabel?: string;
}

export function RowActionsMenu({ items, triggerLabel = 'Aksi' }: RowActionsMenuProps) {
    const visibleItems = items.filter((item) => !item.hidden);
    if (visibleItems.length === 0) {
        return null;
    }

    const regularItems = visibleItems.filter((item) => item.variant !== 'destructive');
    const destructiveItems = visibleItems.filter((item) => item.variant === 'destructive');

    const renderItem = (item: RowActionItem) => {
        const Icon = item.icon;
        const colorClass =
            item.variant === 'destructive'
                ? 'text-destructive focus:text-destructive'
                : item.variant === 'warning'
                  ? 'text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400'
                  : undefined;

        const menuItem = (
            <DropdownMenuItem
                key={item.label}
                disabled={item.disabled}
                onSelect={() => {
                    if (item.disabled) return;
                    // Tunda callback agar dialog/aksi tidak bentrok fokus saat dropdown menutup.
                    setTimeout(() => item.onSelect(), 0);
                }}
                className={cn(colorClass)}
            >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                <span>{item.label}</span>
            </DropdownMenuItem>
        );

        if (item.disabled && item.disabledReason) {
            return (
                <span key={item.label} title={item.disabledReason} className="block cursor-not-allowed">
                    {menuItem}
                </span>
            );
        }

        return menuItem;
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={triggerLabel}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={8}>
                {regularItems.map(renderItem)}
                {regularItems.length > 0 && destructiveItems.length > 0 && <DropdownMenuSeparator />}
                {destructiveItems.map(renderItem)}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
