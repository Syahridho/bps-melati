import { ConfirmDeleteDialog } from '@/components/molecules/confirm-delete-dialog';
import { ChannelDeleteDialogProps } from '@/types/settings';

export default function ChannelDeleteDialog({ open, channel, onClose, onConfirm }: ChannelDeleteDialogProps) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title="Konfirmasi Hapus Kanal"
            description={
                <>
                    Apakah Anda yakin ingin menghapus kanal <strong className="text-foreground">{channel?.name}</strong>? Kanal yang sudah dipakai
                    tiket atau memiliki sub-kanal tidak dapat dihapus — nonaktifkan saja.
                </>
            }
            confirmLabel="Hapus Kanal"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
