import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CheckCompleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    completing: boolean;
    ticketNumber?: string;
    defaultAccessCode?: string;
    onConfirm: (accessCode?: string) => void;
    error?: string;
}

export function CheckCompleteDialog({
    open,
    onOpenChange,
    completing,
    ticketNumber,
    defaultAccessCode = '',
    onConfirm,
    error,
}: CheckCompleteDialogProps) {
    const [accessCode, setAccessCode] = useState(defaultAccessCode);

    useEffect(() => {
        if (defaultAccessCode) {
            setAccessCode(defaultAccessCode);
        } else if (ticketNumber && typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem(`ticket_access_code_${ticketNumber}`) || '';
                if (stored) {
                    setAccessCode(stored);
                }
            } catch {}
        }
    }, [defaultAccessCode, ticketNumber, open]);

    const handleConfirm = () => {
        if (ticketNumber && accessCode && typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(`ticket_access_code_${ticketNumber}`, accessCode);
            } catch {}
        }
        onConfirm(accessCode);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tandai Laporan Selesai?</DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin laporan ini telah selesai ditangani dan ingin menutupnya?{' '}
                        <span className="font-semibold">Tiket yang sudah ditutup tidak dapat dibalas kembali.</span>
                    </DialogDescription>
                </DialogHeader>

                {!defaultAccessCode && (
                    <div className="space-y-2 py-2">
                        <Label htmlFor="complete-access-code">
                            Kode Akses Tiket <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="complete-access-code"
                            type="text"
                            placeholder="Masukkan kode akses dari email laporan..."
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                            Masukkan kode akses yang diberikan saat laporan dibuat untuk memverifikasi hak penyelesaian laporan.
                        </p>
                        {error && <p className="text-destructive text-xs">{error}</p>}
                    </div>
                )}

                <DialogFooter className="mt-4 flex flex-row gap-2 sm:gap-0">
                    <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={completing}>
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={completing || (!defaultAccessCode && !accessCode.trim())}
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
                    >
                        {completing ? (
                            <>
                                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            'Ya, Tandai Selesai'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
