import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type ChannelChildItem, type ChannelItem } from '@/types/sumber-kanal';
import { Trash2 } from 'lucide-react';

interface ChannelDeleteDialogProps {
    open: boolean;
    channel: ChannelItem | ChannelChildItem | null;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ChannelDeleteDialog({ open, channel, onClose, onConfirm }: ChannelDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Konfirmasi Hapus Kanal
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus kanal <strong className="text-foreground">{channel?.name}</strong>?
                        Kanal yang sudah dipakai tiket atau memiliki sub-kanal tidak dapat dihapus — nonaktifkan saja.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm} className="gap-2">
                        Hapus Kanal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
