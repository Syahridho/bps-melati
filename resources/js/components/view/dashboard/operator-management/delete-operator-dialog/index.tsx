import { ConfirmDeleteDialog } from '@/components/molecules/confirm-delete-dialog';
import { OperatorDeleteDialogProps } from '@/types/operator';

export default function OperatorDeleteDialog({ open, operator, onClose, onConfirm }: OperatorDeleteDialogProps) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title="Konfirmasi Hapus Pengguna"
            description={
                <>
                    Apakah Anda yakin ingin menghapus pengguna <strong className="text-foreground">{operator?.name}</strong> ({operator?.email})?
                    Akun akan dinonaktifkan, dan data yang pernah dibuat atau ditangani tetap tersimpan dalam sistem.
                </>
            }
            confirmLabel="Hapus Pengguna"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
