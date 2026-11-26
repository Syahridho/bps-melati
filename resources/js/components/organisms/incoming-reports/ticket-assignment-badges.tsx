import { UserRoundCog } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { assignmentModeLabel } from '@/lib/incoming-reports-utils';

type AssignmentMode = Parameters<typeof assignmentModeLabel>[0];

interface TicketAssignmentBadgesProps {
    assignedToName?: string | null;
    assignmentMode?: AssignmentMode;
    activeAssignmentMode?: AssignmentMode;
    isOrphaned?: boolean;
    showUnassigned?: boolean;
    alwaysShowMode?: boolean;
}

export function TicketAssignmentBadges({
    assignedToName,
    assignmentMode,
    activeAssignmentMode,
    showUnassigned = false,
    alwaysShowMode = false,
}: TicketAssignmentBadgesProps) {
    return (
        <>
            {assignedToName ? (
                <Badge variant="outline" className="gap-1">
                    <UserRoundCog className="size-3" />
                    PIC: {assignedToName}
                </Badge>
            ) : (
                showUnassigned && (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                        <UserRoundCog className="size-3" />
                        Tanpa PIC
                    </Badge>
                )
            )}
            {assignmentMode && (alwaysShowMode || assignmentMode !== activeAssignmentMode) && (
                <Badge variant="secondary">Mode: {assignmentModeLabel(assignmentMode)}</Badge>
            )}
            {/* {isOrphaned && (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Tanpa PIC aktif
                </Badge>
            )} */}
        </>
    );
}
