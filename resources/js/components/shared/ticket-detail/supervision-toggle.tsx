import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { router } from '@inertiajs/react';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface SupervisionToggleProps {
    ticketNumber: string;
    isPengawasan?: boolean;
    disabled?: boolean;
    kadarPengawasanDays?: number;
    classificationDefaultDays?: number;
    updateRoute: string; // url to PATCH
}

export function SupervisionToggle({
    ticketNumber,
    isPengawasan = false,
    disabled = false,
    kadarPengawasanDays = 30,
    classificationDefaultDays = 3,
    updateRoute,
}: SupervisionToggleProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingValue, setPendingValue] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggleAttempt = (aktif: boolean) => {
        setPendingValue(aktif);
        setIsModalOpen(true);
    };

    const handleConfirm = () => {
        if (pendingValue === null) {
            return;
        }

        setIsProcessing(true);
        router.patch(
            updateRoute,
            { aktif: pendingValue },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsModalOpen(false);
                    toast.success(pendingValue ? 'Kadar pengawasan berhasil diaktifkan' : 'Kadar pengawasan berhasil dinonaktifkan', {
                        position: 'bottom-right',
                    });
                },
                onError: (errs) => {
                    const firstError = Object.values(errs)[0];
                    toast.error('Gagal mengubah kadar pengawasan', {
                        description: typeof firstError === 'string' ? firstError : 'Terjadi kesalahan.',
                        position: 'bottom-right',
                    });
                },
                onFinish: () => {
                    setIsProcessing(false);
                    setPendingValue(null);
                },
            },
        );
    };

    return (
        <>
            <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:w-auto">
                <div className="flex min-w-0 flex-col text-left sm:text-right">
                    <span className="flex items-center gap-1 text-xs font-medium sm:justify-end">
                        <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                        Kadar Pengawasan
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                        {isPengawasan ? `Auto close ${kadarPengawasanDays} hari` : `Auto close default (${classificationDefaultDays}h)`}
                    </span>
                </div>
                <Switch checked={isPengawasan} disabled={disabled || isProcessing} onCheckedChange={handleToggleAttempt} />
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold">
                                    {pendingValue ? 'Aktifkan Kadar Pengawasan?' : 'Nonaktifkan Kadar Pengawasan?'}
                                </DialogTitle>
                                <p className="text-muted-foreground text-xs">{ticketNumber}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogDescription asChild>
                        <div className="text-foreground space-y-3 pt-2 text-sm">
                            <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3 text-xs">
                                <div className="text-muted-foreground flex items-center justify-between">
                                    <span>Batas auto close saat ini:</span>
                                    <span className="text-foreground font-semibold">
                                        {pendingValue ? `${classificationDefaultDays} hari` : `${kadarPengawasanDays} hari`}
                                    </span>
                                </div>
                                <div className="text-muted-foreground flex items-center justify-between">
                                    <span>Batas auto close setelah diubah:</span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        {pendingValue ? `${kadarPengawasanDays} hari` : `${classificationDefaultDays} hari`}
                                    </span>
                                </div>
                            </div>

                            <p className="text-muted-foreground text-xs leading-relaxed">
                                {pendingValue
                                    ? `Tiket ini akan diberi waktu respon lebih lama (${kadarPengawasanDays} hari tanpa balasan pelapor) sebelum ditutup otomatis oleh sistem.`
                                    : `Batas waktu auto close akan dikembalikan ke default (${classificationDefaultDays} hari).`}
                            </p>
                        </div>
                    </DialogDescription>

                    <DialogFooter className="gap-2 pt-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className={pendingValue ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}
                            onClick={handleConfirm}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : pendingValue ? (
                                'Ya, Aktifkan'
                            ) : (
                                'Ya, Nonaktifkan'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
