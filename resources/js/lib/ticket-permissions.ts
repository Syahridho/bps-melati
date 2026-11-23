import type { ShowProps } from '@/types/incoming-reports';

export function resolveTicketPermissions(can: ShowProps['can'] | undefined, role: string) {
    const isAdmin = role === 'admin';

    return {
        edit: can?.edit ?? isAdmin,
        delete: can?.delete ?? isAdmin,
        reply: can?.reply ?? isAdmin,
        claim: can?.claim ?? false,
        reassign: can?.reassign ?? isAdmin,
        viewAssignmentHistory: can?.view_assignment_history ?? isAdmin,
    };
}
