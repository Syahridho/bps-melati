import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type CensoredWordItem } from '@/types/sensors';
import { Trash2 } from 'lucide-react';

interface SensorDeleteDialogProps {
    open: boolean;
    word: CensoredWordItem | null;
    onClose: () => void;
    onConfirm: () => void;
}

export default function SensorDeleteDialog({ open, word, onClose, onConfirm }: SensorDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Konfirmasi Hapus Kata
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus kata <strong className="text-foreground">{word?.word}</strong> dari daftar terlarang?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm} className="gap-2">
                        Hapus Kata
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
