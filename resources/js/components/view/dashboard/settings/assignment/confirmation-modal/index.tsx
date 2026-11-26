import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InertiaFormProps } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type AssignmentModeOption, type AssignmentModeValue } from '@/types/settings';

interface ConfirmationAssignmentProps {
    confirmOpen: boolean;
    setConfirmOpen: (open: boolean) => void;
    selectedOption: AssignmentModeOption | undefined;
    form: InertiaFormProps<{ mode: AssignmentModeValue; apply: 'now' | 'scheduled'; scheduled_at: string }>;
    handleSubmit: () => void;
}

export default function ConfirmationAssignment({ confirmOpen, setConfirmOpen, selectedOption, form, handleSubmit }: ConfirmationAssignmentProps) {
    return (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Mode Penanganan Laporan?</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2 text-sm">
                            <p>
                                Mode akan diubah menjadi <strong>{selectedOption?.label ?? form.data.mode}</strong>.
                            </p>
                            <p>Hanya berlaku untuk laporan baru. Laporan lama tidak berubah, termasuk PIC yang sudah ada.</p>
                            {form.data.apply === 'scheduled' && <p>Perubahan akan diterapkan otomatis sesuai jadwal yang dipilih.</p>}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={form.processing}>
                        Batal
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={form.processing}>
                        {form.processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                        Ya, Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
