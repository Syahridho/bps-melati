import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OperatorStatusBadgeProps {
    isActive: boolean;
    isOnline: boolean;
}

export function OperatorStatusBadge({ isActive, isOnline }: OperatorStatusBadgeProps) {
    if (!isActive) {
        return (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
                Nonaktif
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1 text-[10px]',
                isOnline
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
            )}
        >
            <span
                className={cn('inline-block size-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-muted-foreground')}
                aria-hidden="true"
            />
            {isOnline ? 'Online' : 'Offline'}
        </Badge>
    );
}
