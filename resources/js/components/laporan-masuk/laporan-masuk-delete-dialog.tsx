import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type TicketDetail } from '@/types/laporan-masuk';
import { AlertTriangle, LoaderCircle } from 'lucide-react';

interface LaporanMasukDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: TicketDetail;
    isDeleting: boolean;
    onConfirm: () => void;
}

export function LaporanMasukDeleteDialog({ open, onOpenChange, ticket, isDeleting, onConfirm }: LaporanMasukDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2 text-lg">
                        <AlertTriangle className="size-5" />
                        Hapus Laporan?
                    </DialogTitle>
                    <DialogDescription className="space-y-2 pt-2">
                        <p>
                            Apakah Anda yakin ingin menghapus laporan dengan nomor tiket{' '}
                            <strong className="text-foreground">{ticket.ticket_number}</strong>?
                        </p>
                        {ticket.title && <p className="bg-muted text-foreground truncate rounded-md p-2 text-xs font-medium">"{ticket.title}"</p>}
                        <p className="text-destructive text-xs">
                            Tindakan ini permanen dan tidak dapat dibatalkan. Seluruh data terkait (termasuk lampiran dan riwayat balasan) akan
                            terhapus dari sistem.
                        </p>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 pt-3 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                        Batal
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
                        {isDeleting ? (
                            <>
                                <LoaderCircle className="mr-2 size-4 animate-spin" />
                                Menghapus...
                            </>
                        ) : (
                            'Ya, Hapus'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
