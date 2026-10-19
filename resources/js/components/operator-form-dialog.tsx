import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type OperatorFormData } from '@/types/operator';
import { Edit, LoaderCircle, UserPlus } from 'lucide-react';
import { type FormEvent } from 'react';

interface OperatorFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: OperatorFormData;
    setData: <K extends keyof OperatorFormData>(key: K, value: OperatorFormData[K]) => void;
    errors: Partial<Record<keyof OperatorFormData, string>>;
    processing: boolean;
    onSubmit: (e: FormEvent) => void;
}

export function OperatorFormDialog({ open, onOpenChange, mode, data, setData, errors, processing, onSubmit }: OperatorFormDialogProps) {
    const isCreate = mode === 'create';
    const fieldPrefix = isCreate ? 'create' : 'edit';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isCreate ? <UserPlus className="text-primary h-5 w-5" /> : <Edit className="text-primary h-5 w-5" />}
                        {isCreate ? 'Tambah Pengguna Baru' : 'Edit Data Pengguna'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreate
                            ? 'Isi formulir di bawah ini untuk membuat akun Admin, Operator, atau Operator Tim baru.'
                            : 'Perbarui informasi nama, role (Admin/Operator/Operator Tim), email, atau atur ulang password.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor={`${fieldPrefix}_name`}>Nama Lengkap</Label>
                        <Input
                            id={`${fieldPrefix}_name`}
                            placeholder={isCreate ? 'Masukkan nama pengguna' : 'Nama pengguna'}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                    </div>

                    {/* Dropdown Role pengguna di bawah Nama Lengkap */}
                    <div className="space-y-2">
                        <Label htmlFor={`${fieldPrefix}_role`}>Role Pengguna</Label>
                        <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                            <SelectTrigger id={`${fieldPrefix}_role`}>
                                <SelectValue placeholder="Pilih Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="operator">Operator</SelectItem>
                                <SelectItem value="operator_tim">Operator Tim</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && <p className="text-destructive text-xs">{errors.role}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`${fieldPrefix}_email`}>Alamat Email</Label>
                        <Input
                            id={`${fieldPrefix}_email`}
                            type="email"
                            placeholder={isCreate ? 'pengguna@melati.bps.go.id' : 'Email pengguna'}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`${fieldPrefix}_password`}>{isCreate ? 'Password' : 'Password Baru (Opsional)'}</Label>
                        <Input
                            id={`${fieldPrefix}_password`}
                            type="password"
                            placeholder={isCreate ? 'Minimal 8 karakter' : 'Kosongkan jika tidak ingin mengubah password'}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-2">
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {isCreate ? 'Simpan Pengguna' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
