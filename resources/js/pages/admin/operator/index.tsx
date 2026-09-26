import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import AdminPage from '@/pages/admin/page';
import { type PaginatedData, type SharedData } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Edit,
    KeyRound,
    LoaderCircle,
    MoreHorizontal,
    Search,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface Operator {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

interface OperatorPageProps extends SharedData {
    operators: PaginatedData<Operator>;
    filters: {
        search: string;
        per_page: number;
    };
    flash: {
        success?: string;
    };
}

export default function KelolaOperator() {
    const { operators, filters, flash } = usePage<OperatorPageProps>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
    const [deletingOperator, setDeletingOperator] = useState<Operator | null>(null);

    // Form Tambah Operator/User
    const createForm = useForm({
        name: '',
        role: 'operator',
        email: '',
        password: '',
    });

    // Form Edit Operator/User
    const editForm = useForm({
        name: '',
        role: 'operator',
        email: '',
        password: '',
    });

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Live search handler
    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(
            route('dashboard.admin.operator.index'),
            { search: value, per_page: filters.per_page },
            { preserveState: true, replace: true }
        );
    };

    // Form Submit: Tambah Operator/User
    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(route('dashboard.admin.operator.store'), {
            onSuccess: () => {
                createForm.reset();
                setIsCreateOpen(false);
            },
        });
    };

    // Form Submit: Edit Operator/User
    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingOperator) return;

        editForm.put(route('dashboard.admin.operator.update', editingOperator.id), {
            onSuccess: () => {
                editForm.reset();
                setEditingOperator(null);
            },
        });
    };

    // Action: Open Edit Modal
    const openEditModal = (op: Operator) => {
        setEditingOperator(op);
        editForm.setData({
            name: op.name,
            role: op.role || 'operator',
            email: op.email,
            password: '',
        });
        editForm.clearErrors();
    };

    // Action: Delete Operator/User
    const handleDeleteSubmit = () => {
        if (!deletingOperator) return;

        router.delete(route('dashboard.admin.operator.destroy', deletingOperator.id), {
            onSuccess: () => {
                setDeletingOperator(null);
            },
        });
    };

    return (
        <AdminPage
            title="Kelola Pengguna & Operator"
            description="Manajemen akun admin dan operator untuk pengelolaan laporan dan data sistem Melati"
            breadcrumbs={[{ title: 'Kelola Operator', href: route('dashboard.admin.operator.index') }]}
        >
            <div className="space-y-6">
                {/* Alert Pesan Sukses */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Users className="h-5 w-5 text-primary" />
                                Daftar Akun Pengguna
                            </CardTitle>
                            <CardDescription>
                                Total {operators.total} akun terdaftar dalam sistem
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => {
                                createForm.reset();
                                createForm.clearErrors();
                                setIsCreateOpen(true);
                            }}
                            className="gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            Tambah Pengguna Baru
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Bar */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Cari berdasarkan nama atau email..."
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Tabel Pengguna */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">No</TableHead>
                                        <TableHead>Nama Lengkap</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Tanggal Dibuat</TableHead>
                                        <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {operators.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Tidak ada data pengguna ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        operators.data.map((op, idx) => (
                                            <TableRow key={op.id}>
                                                <TableCell className="font-medium">
                                                    {(operators.current_page - 1) * operators.per_page + idx + 1}
                                                </TableCell>
                                                <TableCell className="font-semibold text-foreground">
                                                    {op.name}
                                                </TableCell>
                                                <TableCell>{op.email}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={op.role === 'admin' ? 'default' : 'secondary'}
                                                        className="capitalize"
                                                    >
                                                        {op.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {new Date(op.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Buka menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEditModal(op)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeletingOperator(op)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <Pagination data={operators} />
                    </CardContent>
                </Card>
            </div>

            {/* Modal Tambah Pengguna */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Tambah Pengguna Baru
                        </DialogTitle>
                        <DialogDescription>
                            Isi formulir di bawah ini untuk membuat akun Admin atau Operator baru.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="create_name">Nama Lengkap</Label>
                            <Input
                                id="create_name"
                                placeholder="Masukkan nama pengguna"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                            />
                            {createForm.errors.name && (
                                <p className="text-xs text-destructive">{createForm.errors.name}</p>
                            )}
                        </div>

                        {/* Dropdown Role pengguna di bawah Nama Lengkap */}
                        <div className="space-y-2">
                            <Label htmlFor="create_role">Role Pengguna</Label>
                            <Select
                                value={createForm.data.role}
                                onValueChange={(value) => createForm.setData('role', value)}
                            >
                                <SelectTrigger id="create_role">
                                    <SelectValue placeholder="Pilih Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operator">Operator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            {createForm.errors.role && (
                                <p className="text-xs text-destructive">{createForm.errors.role}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create_email">Alamat Email</Label>
                            <Input
                                id="create_email"
                                type="email"
                                placeholder="pengguna@melati.bps.go.id"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                            />
                            {createForm.errors.email && (
                                <p className="text-xs text-destructive">{createForm.errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create_password">Password</Label>
                            <Input
                                id="create_password"
                                type="password"
                                placeholder="Minimal 8 karakter"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                            />
                            {createForm.errors.password && (
                                <p className="text-xs text-destructive">{createForm.errors.password}</p>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="gap-2">
                                {createForm.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Simpan Pengguna
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Edit Pengguna */}
            <Dialog open={!!editingOperator} onOpenChange={(open) => !open && setEditingOperator(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-primary" />
                            Edit Data Pengguna
                        </DialogTitle>
                        <DialogDescription>
                            Perbarui informasi nama, role (Admin/Operator), email, atau atur ulang password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_name">Nama Lengkap</Label>
                            <Input
                                id="edit_name"
                                placeholder="Nama pengguna"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            {editForm.errors.name && (
                                <p className="text-xs text-destructive">{editForm.errors.name}</p>
                            )}
                        </div>

                        {/* Dropdown Role pengguna di bawah Nama Lengkap */}
                        <div className="space-y-2">
                            <Label htmlFor="edit_role">Role Pengguna</Label>
                            <Select
                                value={editForm.data.role}
                                onValueChange={(value) => editForm.setData('role', value)}
                            >
                                <SelectTrigger id="edit_role">
                                    <SelectValue placeholder="Pilih Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operator">Operator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            {editForm.errors.role && (
                                <p className="text-xs text-destructive">{editForm.errors.role}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_email">Alamat Email</Label>
                            <Input
                                id="edit_email"
                                type="email"
                                placeholder="Email pengguna"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                            />
                            {editForm.errors.email && (
                                <p className="text-xs text-destructive">{editForm.errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_password" className="flex items-center gap-1">
                                <KeyRound className="h-3.5 w-3.5" /> Password Baru (Opsional)
                            </Label>
                            <Input
                                id="edit_password"
                                type="password"
                                placeholder="Kosongkan jika tidak ingin mengubah password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                            />
                            {editForm.errors.password && (
                                <p className="text-xs text-destructive">{editForm.errors.password}</p>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setEditingOperator(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="gap-2">
                                {editForm.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Hapus Pengguna */}
            <Dialog open={!!deletingOperator} onOpenChange={(open) => !open && setDeletingOperator(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Konfirmasi Hapus Pengguna
                        </DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus pengguna{' '}
                            <strong className="text-foreground">{deletingOperator?.name}</strong> ({deletingOperator?.email})?
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setDeletingOperator(null)}>
                            Batal
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteSubmit} className="gap-2">
                            Hapus Pengguna
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
