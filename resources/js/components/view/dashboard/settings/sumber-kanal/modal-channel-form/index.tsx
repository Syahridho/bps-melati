import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { type ChannelFormData, type ChannelParentOption } from '@/types/sumber-kanal';
import { Edit, LoaderCircle, PlusCircle } from 'lucide-react';
import { type FormEvent } from 'react';

interface ChannelFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: ChannelFormData;
    setData: <K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) => void;
    errors: Partial<Record<keyof ChannelFormData, string>>;
    processing: boolean;
    parents: ChannelParentOption[];
    editingId?: number | null;
    onSubmit: (e: FormEvent) => void;
}

export default function ChannelFormDialog({ open, onOpenChange, mode, data, setData, errors, processing, parents, editingId, onSubmit }: ChannelFormDialogProps) {
    const isCreate = mode === 'create';
    const isRoot = !data.parent_id;
    const hexValid = /^#[0-9a-fA-F]{6}$/.test(data.color);

    const handleParentChange = (value: string) => {
        setData('parent_id', value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isCreate ? <PlusCircle className="text-primary h-5 w-5" /> : <Edit className="text-primary h-5 w-5" />}
                        {isCreate ? 'Tambah Kanal' : 'Edit Kanal'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreate
                            ? 'Tambah kanal utama atau sub-kanal. Warna wajib diisi untuk kanal utama.'
                            : 'Perbarui nama, warna, urutan, atau status kanal. Slug tidak dapat diubah.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel_name">Nama Kanal *</Label>
                        <Input id="channel_name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="mis. Android" />
                        {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="channel_parent">Kanal Induk (opsional)</Label>
                        {data.parent_id === '' && isRoot ? (
                            <p className="text-muted-foreground text-xs">Kosong = kanal utama. Pilih induk untuk membuat sub-kanal (maksimal 2 level).</p>
                        ) : null}
                        <Select value={data.parent_id || 'none'} onValueChange={(v) => handleParentChange(v === 'none' ? '' : v)}>
                            <SelectTrigger id="channel_parent">
                                <SelectValue placeholder="Tanpa induk (kanal utama)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tanpa induk (kanal utama)</SelectItem>
                                {parents
                                    .filter((p) => p.id !== editingId)
                                    .map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {errors.parent_id && <p className="text-destructive text-xs">{errors.parent_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="channel_color">Warna {isRoot ? '*' : '(opsional, mewarisi induk)'}</Label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="channel_color_picker"
                                aria-label="Pilih warna"
                                value={hexValid ? data.color : '#8b5cf6'}
                                onChange={(e) => setData('color', e.target.value)}
                                className="h-10 w-12 cursor-pointer rounded-md border p-1"
                            />
                            <Input
                                id="channel_color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                placeholder="#8b5cf6"
                                className="w-32 font-mono"
                            />
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: hexValid ? data.color : 'transparent' }} />
                                Preview
                            </span>
                        </div>
                        {errors.color && <p className="text-destructive text-xs">{errors.color}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="channel_sort_order">Urutan *</Label>
                            <Input
                                id="channel_sort_order"
                                type="number"
                                min={0}
                                value={data.sort_order}
                                onChange={(e) => setData('sort_order', e.target.value)}
                            />
                            {errors.sort_order && <p className="text-destructive text-xs">{errors.sort_order}</p>}
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                            <Switch id="channel_is_active" checked={data.is_active} onCheckedChange={(v) => setData('is_active', v)} />
                            <Label htmlFor="channel_is_active">Aktif</Label>
                        </div>
                    </div>
                    {errors.is_active && <p className="text-destructive text-xs">{errors.is_active}</p>}

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-2">
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {isCreate ? 'Simpan Kanal' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
