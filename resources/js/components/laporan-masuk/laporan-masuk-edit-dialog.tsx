import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { classificationLabel } from '@/lib/laporan-masuk-utils';
import { type TicketDetail } from '@/types/laporan-masuk';
import { LoaderCircle, Pencil } from 'lucide-react';
import { type FormEvent } from 'react';

interface EditFormData {
    reporter_name: string;
    reporter_email: string;
    reporter_wa: string;
    title: string;
    content: string;
}

interface LaporanMasukEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: TicketDetail;
    data: EditFormData;
    setData: <K extends keyof EditFormData>(key: K, value: EditFormData[K]) => void;
    errors: Partial<Record<keyof EditFormData, string>>;
    processing: boolean;
    onSubmit: (e: FormEvent) => void;
}

export function LaporanMasukEditDialog({ open, onOpenChange, ticket, data, setData, errors, processing, onSubmit }: LaporanMasukEditDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Pencil className="text-primary size-5" />
                        Edit Laporan
                    </DialogTitle>
                    <DialogDescription>Perbarui data informasi pelapor, judul, dan isi laporan.</DialogDescription>
                </DialogHeader>

                <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Nomor Tiket:</span>
                        <span className="text-foreground font-semibold">{ticket.ticket_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Klasifikasi:</span>
                        <span className="text-foreground font-medium">{classificationLabel(ticket.classification)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Periode & Urut:</span>
                        <span className="text-foreground font-medium">
                            {ticket.period} (Urut #{ticket.sequence})
                        </span>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 pt-2">
                    <div>
                        <Label htmlFor="edit_reporter_name" className="mb-1 block text-xs">
                            Nama Pelapor
                        </Label>
                        <Input
                            id="edit_reporter_name"
                            placeholder="Masukkan nama pelapor"
                            value={data.reporter_name}
                            onChange={(e) => setData('reporter_name', e.target.value)}
                        />
                        {errors.reporter_name && <p className="text-destructive mt-1 text-xs">{errors.reporter_name}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="edit_reporter_email" className="mb-1 block text-xs">
                                Email
                            </Label>
                            <Input
                                id="edit_reporter_email"
                                type="email"
                                placeholder="nama@email.com"
                                value={data.reporter_email}
                                onChange={(e) => setData('reporter_email', e.target.value)}
                            />
                            {errors.reporter_email && <p className="text-destructive mt-1 text-xs">{errors.reporter_email}</p>}
                        </div>
                        <div>
                            <Label htmlFor="edit_reporter_wa" className="mb-1 block text-xs">
                                WhatsApp (Angka saja)
                            </Label>
                            <Input
                                id="edit_reporter_wa"
                                placeholder="08123456789"
                                value={data.reporter_wa}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setData('reporter_wa', val);
                                }}
                            />
                            {errors.reporter_wa && <p className="text-destructive mt-1 text-xs">{errors.reporter_wa}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="edit_title" className="mb-1 block text-xs">
                            Judul Laporan <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="edit_title"
                            placeholder="Masukkan judul laporan"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                        />
                        {errors.title && <p className="text-destructive mt-1 text-xs">{errors.title}</p>}
                    </div>

                    <div>
                        <Label htmlFor="edit_content" className="mb-1 block text-xs">
                            Isi Laporan <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="edit_content"
                            rows={5}
                            placeholder="Tuliskan isi laporan..."
                            value={data.content}
                            onChange={(e) => setData('content', e.target.value)}
                        />
                        {errors.content && <p className="text-destructive mt-1 text-xs">{errors.content}</p>}
                    </div>

                    <DialogFooter className="gap-2 pt-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
