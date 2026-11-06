import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

export interface TicketEditDeleteActionsProps {
    canEdit?: boolean;
    canDelete?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    dialogs?: ReactNode;
}

export function TicketEditDeleteActions({
    canEdit = false,
    canDelete = false,
    onEdit,
    onDelete,
    dialogs,
}: TicketEditDeleteActionsProps) {
    if (!canEdit && !canDelete) {
        return dialogs ? <>{dialogs}</> : null;
    }

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {canEdit && onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Pencil className="mr-1.5 size-4" />
                        Edit
                    </Button>
                )}
                {canDelete && onDelete && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="mr-1.5 size-4" />
                        Hapus
                    </Button>
                )}
            </div>
            {dialogs}
        </>
    );
}
