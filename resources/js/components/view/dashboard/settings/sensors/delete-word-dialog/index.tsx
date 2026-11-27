import { ConfirmDeleteDialog } from '@/components/molecules/confirm-delete-dialog';
import { SensorDeleteDialogProps } from '@/types/settings';

export default function SensorDeleteDialog({ open, word, onClose, onConfirm }: SensorDeleteDialogProps) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title="Konfirmasi Hapus Kata"
            description={
                <>
                    Apakah Anda yakin ingin menghapus kata <strong className="text-foreground">{word?.word}</strong> dari daftar terlarang?
                </>
            }
            confirmLabel="Hapus Kata"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
