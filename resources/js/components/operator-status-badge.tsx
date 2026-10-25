import { Badge } from '@/components/ui/badge';

interface OperatorStatusBadgeProps {
    isActive: boolean;
    isOnline: boolean;
}

export function OperatorStatusBadge({ isActive, isOnline }: OperatorStatusBadgeProps) {
    if (!isActive) {
        return (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[11px] font-medium text-destructive">
                Nonaktif
            </Badge>
        );
    }

    if (isOnline) {
        return (
            <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400"
            >
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Online
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="gap-1.5 border-slate-300/80 bg-slate-100 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
        >
            <span className="size-1.5 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden="true" />
            Offline
        </Badge>
    );
}
