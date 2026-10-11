import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type StoredTicket } from '@/types/welcome';
import { Trash2 } from 'lucide-react';

interface DeleteTicketDialogProps {
    ticket: StoredTicket | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteTicketDialog({ ticket, onConfirm, onCancel }: DeleteTicketDialogProps) {
    return (
        <Dialog open={!!ticket} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="bg-destructive/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
                        <Trash2 className="text-destructive size-8" />
                    </div>
                    <DialogTitle className="text-center">Hapus dari riwayat?</DialogTitle>
                    <DialogDescription className="text-center">
                        Nomor tiket <span className="text-foreground font-mono font-semibold break-all">{ticket?.ticket_number}</span> akan dihapus
                        dari riwayat di perangkat ini. Pastikan Anda sudah menyimpan nomor tiketnya, karena Anda memerlukannya untuk mengecek status
                        laporan.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button variant="destructive" className="w-full" onClick={onConfirm}>
                        Ya, hapus
                    </Button>
                    <Button variant="outline" className="w-full" onClick={onCancel}>
                        Batal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
