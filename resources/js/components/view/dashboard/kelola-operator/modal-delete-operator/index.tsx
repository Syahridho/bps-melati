import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Operator } from '@/types/operator';
import { Trash2 } from 'lucide-react';

interface OperatorDeleteDialogProps {
    open: boolean;
    operator: Operator | null;
    onClose: () => void;
    onConfirm: () => void;
}

export default function OperatorDeleteDialog({ open, operator, onClose, onConfirm }: OperatorDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Konfirmasi Hapus Pengguna
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus pengguna <strong className="text-foreground">{operator?.name}</strong> ({operator?.email})?
                        Akun akan dinonaktifkan, dan data yang pernah dibuat atau ditangani tetap tersimpan dalam sistem.
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
