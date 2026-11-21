import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type AssignableOperator } from '@/types/incoming-reports';
import { router, useForm } from '@inertiajs/react';
import { LoaderCircle, UserRoundCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const NO_PIC = 'none';

interface TicketReassignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticketId: number;
    currentPicId: number | null;
    operators: AssignableOperator[];
}

export function TicketReassignDialog({ open, onOpenChange, ticketId, currentPicId, operators }: TicketReassignDialogProps) {
    const [releasing, setReleasing] = useState(false);

    const form = useForm({
        assigned_to: currentPicId ? String(currentPicId) : NO_PIC,
        note: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            assigned_to: currentPicId ? String(currentPicId) : NO_PIC,
            note: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset hanya saat dialog dibuka
    }, [open, currentPicId]);

    const handleSubmit = () => {
        form.transform((data) => ({
            assigned_to: data.assigned_to === NO_PIC ? null : Number(data.assigned_to),
            note: data.note,
        }));

        form.post(route('dashboard.admin.incoming-reports.assignment.update', { ticket: ticketId }), {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                toast.success('PIC tiket berhasil diperbarui.');
            },
            onError: (errors) => {
                toast.error('Gagal memperbarui PIC', {
                    description: Object.values(errors)[0] ?? 'Periksa kembali pilihan operator.',
                });
            },
        });
    };

    const handleRelease = () => {
        router.delete(route('dashboard.admin.incoming-reports.assignment.destroy', { ticket: ticketId }), {
            preserveScroll: true,
            onStart: () => setReleasing(true),
            onFinish: () => setReleasing(false),
            onSuccess: () => {
                onOpenChange(false);
                toast.success('PIC tiket berhasil dilepas.');
            },
            onError: () => toast.error('Gagal melepas PIC tiket.'),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserRoundCog className="text-primary size-5" />
                        Ubah PIC Tiket
                    </DialogTitle>
                    <DialogDescription>
                        Pilih operator yang akan menjadi penanggung jawab laporan. Perubahan PIC tidak mengubah mode tiket.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="assignment-pic">Operator</Label>
                        <Select value={form.data.assigned_to} onValueChange={(value) => form.setData('assigned_to', value)}>
                            <SelectTrigger id="assignment-pic">
                                <SelectValue placeholder="Pilih operator" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_PIC}>Tanpa PIC</SelectItem>
                                {operators.map((operator) => (
                                    <SelectItem key={operator.id} value={String(operator.id)}>
                                        {operator.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.errors.assigned_to && <p className="text-destructive text-xs">{form.errors.assigned_to}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assignment-note">Catatan (opsional)</Label>
                        <Input
                            id="assignment-note"
                            value={form.data.note}
                            onChange={(event) => form.setData('note', event.target.value)}
                            placeholder="Alasan perubahan PIC"
                        />
                        {form.errors.note && <p className="text-destructive text-xs">{form.errors.note}</p>}
                    </div>
                </div>

                <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={handleRelease} disabled={releasing || form.processing}>
                        {releasing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                        Lepas PIC
                    </Button>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                            Batal
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={form.processing}>
                            {form.processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                            Simpan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
