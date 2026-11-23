import { UserRoundCog } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { assignmentModeLabel } from '@/lib/incoming-reports-utils';

type AssignmentMode = Parameters<typeof assignmentModeLabel>[0];

interface TicketAssignmentBadgesProps {
    assignedToName?: string | null;
    assignmentMode?: AssignmentMode;
    activeAssignmentMode?: AssignmentMode;
    isOrphaned?: boolean;
}

export function TicketAssignmentBadges({ assignedToName, assignmentMode, activeAssignmentMode, isOrphaned }: TicketAssignmentBadgesProps) {
    return (
        <>
            {assignedToName && (
                <Badge variant="outline" className="gap-1">
                    <UserRoundCog className="size-3" />
                    PIC: {assignedToName}
                </Badge>
            )}
            {assignmentMode && assignmentMode !== activeAssignmentMode && (
                <Badge variant="secondary">Mode: {assignmentModeLabel(assignmentMode)}</Badge>
            )}
            {isOrphaned && (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Tanpa PIC aktif
                </Badge>
            )}
        </>
    );
}
