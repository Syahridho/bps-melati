import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CheckCompleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    completing: boolean;
    onConfirm: () => void;
}

export function CheckCompleteDialog({ open, onOpenChange, completing, onConfirm }: CheckCompleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tandai Laporan Selesai?</DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin laporan ini telah selesai ditangani dan ingin menutupnya? <span className="font-semibold">Tiket yang sudah ditutup tidak dapat dibalas
                        kembali.</span> 
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex flex-row gap-2 sm:gap-0">
                    <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                        disabled={completing}
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
                    >
                        Ya, Tandai Selesai
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
