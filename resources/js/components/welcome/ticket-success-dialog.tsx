import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Copy } from 'lucide-react';

interface TicketSuccessDialogProps {
    open: boolean;
    ticketNumber: string | null;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
}

export function TicketSuccessDialog({ open, ticketNumber, copied, onCopy, onClose }: TicketSuccessDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                    </div>
                    <DialogTitle className="text-center">Laporan berhasil dikirim</DialogTitle>
                    <DialogDescription className="text-center">Simpan nomor tiket berikut untuk memantau status laporan Anda.</DialogDescription>
                </DialogHeader>

                {ticketNumber && (
                    <div className="bg-muted/50 rounded-lg border p-4">
                        <p className="text-muted-foreground mb-1 text-xs font-medium">Nomor tiket</p>
                        <p className="text-lg font-bold tracking-wide break-all">{ticketNumber}</p>
                    </div>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button onClick={onCopy} variant="outline" className="w-full">
                        <Copy className="size-4" />
                        {copied ? 'Tersalin' : 'Salin nomor tiket'}
                    </Button>
                    <Button onClick={onClose} className="w-full">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
