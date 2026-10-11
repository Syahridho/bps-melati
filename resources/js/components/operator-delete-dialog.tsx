import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Operator } from '@/types/operator';
import { Trash2 } from 'lucide-react';

interface OperatorDeleteDialogProps {
    operator: Operator | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function OperatorDeleteDialog({ operator, onClose, onConfirm }: OperatorDeleteDialogProps) {
    return (
        <Dialog open={!!operator} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Konfirmasi Hapus Pengguna
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus pengguna <strong className="text-foreground">{operator?.name}</strong> ({operator?.email})?
                        Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm} className="gap-2">
                        Hapus Pengguna
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
