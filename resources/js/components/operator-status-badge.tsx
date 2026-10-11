import { Badge } from '@/components/ui/badge';

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
            className={isOnline ? 'gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400' : 'text-[10px]'}
        >
            <span
                className={isOnline ? 'inline-block size-1.5 rounded-full bg-emerald-500' : 'bg-muted-foreground inline-block size-1.5 rounded-full'}
                aria-hidden="true"
            />
            {isOnline ? 'Online' : 'Offline'}
        </Badge>
    );
}
