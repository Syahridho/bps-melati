import { Badge } from '@/components/ui/badge';
import { METHOD_BADGE_CLASSES } from '@/lib/api-docs-view';

export function MethodBadge({ method }: { method: string }) {
    return (
        <Badge variant="outline" className={METHOD_BADGE_CLASSES[method] ?? 'bg-muted text-muted-foreground'}>
            {method}
        </Badge>
    );
}
