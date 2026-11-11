import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSumberKanalManagement } from '@/hooks/use-sumber-kanal-management';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type SumberKanalPageProps } from '@/types/sumber-kanal';
import { Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Edit, Plus, Trash2 } from 'lucide-react';
import ChannelFormDialog from './modal-channel-form';
import ChannelDeleteDialog from './modal-delete-channel';

export default function SumberKanalView() {
    const { channels, parents, flash } = usePage<SumberKanalPageProps>().props;

    const {
        successMessage,
        isCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        deletingChannel,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleDeleteSubmit,
    } = useSumberKanalManagement(flash?.success);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pengaturan', href: route('settings.application.edit') },
        { title: 'Sumber Kanal', href: route('settings.sumber-kanal.index') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sumber Kanal" />
            <SettingsLayout title="Pengaturan" description="Kelola sumber kanal laporan (nama, warna, urutan, dan status aktif)">
                <div className="space-y-6">
                    {successMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Sumber Kanal</CardTitle>
                                <CardDescription>Kanal induk ditampilkan di grafik dashboard; sub-kanal digabung ke induknya.</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => openCreateModal()} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Tambah Kanal
                                </Button>
                                <Button onClick={() => openCreateModal()} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Tambah Sub Kanal
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Warna</TableHead>
                                            <TableHead>Urutan</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Jumlah Tiket</TableHead>
                                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {channels.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                    Belum ada kanal.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            channels.flatMap((root) => [
                                                <TableRow key={root.id} className="font-medium">
                                                    <TableCell>{root.name}</TableCell>
                                                    <TableCell>
                                                        <span className="flex items-center gap-2">
                                                            <span
                                                                className="inline-block h-4 w-4 rounded-full border"
                                                                style={{ backgroundColor: root.effective_color ?? root.color ?? 'transparent' }}
                                                            />
                                                            <span className="font-mono text-xs">{root.color ?? '-'}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{root.sort_order}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={root.is_active ? 'default' : 'secondary'}>
                                                            {root.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{root.tickets_count}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(root)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openDeleteModal(root)}>
                                                                <Trash2 className="text-destructive h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>,
                                                ...root.children.map((child) => (
                                                    <TableRow key={child.id} className="bg-muted/30">
                                                        <TableCell className="text-muted-foreground pl-8">↳ {child.name}</TableCell>
                                                        <TableCell>
                                                            <span className="flex items-center gap-2">
                                                                <span
                                                                    className="inline-block h-3 w-3 rounded-full border"
                                                                    style={{ backgroundColor: child.effective_color ?? child.color ?? 'transparent' }}
                                                                />
                                                                <span className="font-mono text-xs">{child.color ?? '(warisan)'}</span>
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{child.sort_order}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={child.is_active ? 'default' : 'secondary'}>
                                                                {child.is_active ? 'Aktif' : 'Nonaktif'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{child.tickets_count}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(child)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => openDeleteModal(child)}>
                                                                    <Trash2 className="text-destructive h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )),
                                            ])
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-muted-foreground mt-3 text-xs">
                                Menonaktifkan kanal induk akan menyembunyikan sub-kanalnya dari pilihan form dan grafik dashboard. Kanal yang sudah
                                dipakai tiket tidak dapat dihapus.
                            </p>
                        </CardContent>
                    </Card>

                    <ChannelFormDialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            if (!open) closeCreateModal();
                        }}
                        mode="create"
                        data={createForm.data}
                        setData={createForm.setData}
                        errors={createForm.errors}
                        processing={createForm.processing}
                        parents={parents}
                        onSubmit={handleCreateSubmit}
                    />
                    <ChannelFormDialog
                        open={isEditOpen}
                        onOpenChange={(open) => {
                            if (!open) closeEditModal();
                        }}
                        mode="edit"
                        data={editForm.data}
                        setData={editForm.setData}
                        errors={editForm.errors}
                        processing={editForm.processing}
                        parents={parents}
                        editingId={undefined}
                        onSubmit={handleEditSubmit}
                    />
                    <ChannelDeleteDialog open={isDeleteOpen} channel={deletingChannel} onClose={closeDeleteModal} onConfirm={handleDeleteSubmit} />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
