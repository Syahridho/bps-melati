import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InputDataDeleteTicketDialogProps {
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    isDeleting: boolean;
    ticket: { ticket_number: string };
    handleDeleteSubmit: () => void;
}

export default function InputDataDeleteTicketDialog({
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleting,
    ticket,
    handleDeleteSubmit,
}: InputDataDeleteTicketDialogProps) {
    return (
        <>
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Tiket Input Data</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Apakah Anda yakin ingin menghapus tiket <strong>{ticket.ticket_number}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Batal
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteSubmit} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
