import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { type SensorFormData } from '@/types/sensors';
import { Edit, LoaderCircle, PlusCircle } from 'lucide-react';
import { type FormEvent } from 'react';

interface SensorFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: SensorFormData;
    setData: <K extends keyof SensorFormData>(key: K, value: SensorFormData[K]) => void;
    errors: Partial<Record<keyof SensorFormData, string>>;
    processing: boolean;
    editingId?: number | null;
    onSubmit: (e: FormEvent) => void;
}

export default function SensorFormDialog({
    open,
    onOpenChange,
    mode,
    data,
    setData,
    errors,
    processing,
    // editingId,
    onSubmit,
}: SensorFormDialogProps) {
    const isCreate = mode === 'create';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isCreate ? <PlusCircle className="text-primary h-5 w-5" /> : <Edit className="text-primary h-5 w-5" />}
                        {isCreate ? 'Tambah Kata Terlarang' : 'Edit Kata Terlarang'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreate
                            ? 'Tambah kata yang akan otomatis disensor pada laporan dan tanggapan.'
                            : 'Perbarui kata, mode pencocokan, atau status kata terlarang.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sensor_word">Kata *</Label>
                        <Input
                            id="sensor_word"
                            value={data.word}
                            onChange={(e) => setData('word', e.target.value)}
                            placeholder="mis. anjing"
                            maxLength={50}
                        />
                        {errors.word && <p className="text-destructive text-xs">{errors.word}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sensor_match_type">Mode Pencocokan *</Label>
                        <Select value={data.match_type} onValueChange={(v) => setData('match_type', v as 'anywhere' | 'whole_word')}>
                            <SelectTrigger id="sensor_match_type">
                                <SelectValue placeholder="Pilih mode pencocokan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="anywhere">Di mana saja (termasuk kata menempel)</SelectItem>
                                <SelectItem value="whole_word">Kata utuh saja</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.match_type && <p className="text-destructive text-xs">{errors.match_type}</p>}
                        <p className="text-muted-foreground text-xs">{defaultMatchTypeHint(data.word)}</p>
                    </div>

                    <div className="flex items-end gap-2 pb-2">
                        <Switch id="sensor_is_active" checked={data.is_active} onCheckedChange={(v) => setData('is_active', v)} />
                        <Label htmlFor="sensor_is_active">Aktif</Label>
                    </div>
                    {errors.is_active && <p className="text-destructive text-xs">{errors.is_active}</p>}

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-2">
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {isCreate ? 'Simpan Kata' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const defaultMatchTypeHint = (word: string): string => {
    const isLong = word.length >= 5;
    return isLong
        ? 'Kata 5 huruf atau lebih default menggunakan mode "Di mana saja" (cocok di seluruh teks).'
        : 'Kata 4 huruf atau kurang default menggunakan mode "Kata utuh" (hanya cocok sebagai kata tersendiri).';
};
