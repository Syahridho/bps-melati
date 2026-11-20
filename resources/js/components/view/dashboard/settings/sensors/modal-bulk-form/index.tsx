import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SensorBulkFormDialogProps } from '@/types/settings';
import { useForm } from '@inertiajs/react';
import { Layers, LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';
import { toast } from 'sonner';

export default function SensorBulkFormDialog({ open, onOpenChange }: SensorBulkFormDialogProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
        words: string;
        match_type: 'anywhere' | 'whole_word';
        is_active: boolean;
        [key: string]: string | boolean;
    }>({
        words: '',
        match_type: 'anywhere',
        is_active: true,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.sensors.bulk'), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
                toast.success('Proses tambah banyak kata selesai');
            },
        });
    };

    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            clearErrors();
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="text-primary h-5 w-5" />
                        Tambah Banyak Kata Terlarang
                    </DialogTitle>
                    <DialogDescription>Masukkan beberapa kata terlarang sekaligus. Tulis satu kata per baris.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sensor_bulk_words">Daftar Kata (satu per baris) *</Label>
                        <Textarea
                            id="sensor_bulk_words"
                            rows={6}
                            value={data.words}
                            onChange={(e) => setData('words', e.target.value)}
                            placeholder={'kata kasar 1\nKata Kasar 2'}
                            className="font-mono text-sm"
                        />
                        {errors.words && <p className="text-destructive text-xs">{errors.words}</p>}
                        <p className="text-muted-foreground text-xs">Baris kosong atau kata yang sudah terdaftar akan otomatis dilewati.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sensor_bulk_match_type">Mode Pencocokan untuk Semua Kata *</Label>
                        <Select value={data.match_type} onValueChange={(v) => setData('match_type', v as 'anywhere' | 'whole_word')}>
                            <SelectTrigger id="sensor_bulk_match_type">
                                <SelectValue placeholder="Pilih mode pencocokan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="anywhere">Di mana saja (termasuk kata menempel)</SelectItem>
                                <SelectItem value="whole_word">Kata utuh saja</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.match_type && <p className="text-destructive text-xs">{errors.match_type}</p>}
                    </div>

                    <div className="flex items-end gap-2 pb-2">
                        <Switch id="sensor_bulk_is_active" checked={data.is_active} onCheckedChange={(v) => setData('is_active', v)} />
                        <Label htmlFor="sensor_bulk_is_active">Aktifkan Semua Kata</Label>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-2">
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Simpan Semua
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
