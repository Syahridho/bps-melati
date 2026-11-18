import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useSensorManagement } from '@/hooks/use-sensor-management';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type CensoredWordItem } from '@/types/sensors';
import { Head, usePage } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import SensorFormDialog from './modal-word-form';
import SensorBulkFormDialog from './modal-bulk-form';
import SensorDeleteDialog from './modal-delete-word';

export default function SensorsView() {
    const { words, flash } = usePage<{
        words: CensoredWordItem[];
        flash: { success?: string };
    }>().props;
    const [search, setSearch] = useState('');
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const {
        successMessage,
        isCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        deletingWord,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleDeleteSubmit,
        handleToggle,
        editingWord,
    } = useSensorManagement(flash?.success);

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sensor Kata Kasar', href: route('settings.sensors.index') }];

    const filteredWords = words.filter((w) =>
        w.word.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sensor Kata Kasar" />
            <SettingsLayout
                title="Sensor Kata Kasar"
                description="Kelola daftar kata yang otomatis disensor pada laporan dan tanggapan."
            >
                <div className="space-y-6">
                    {successMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                            {successMessage}
                        </div>
                    )}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">Sensor Kata Kasar</CardTitle>
                            <CardDescription>
                                Kelola daftar kata yang otomatis disensor pada laporan dan tanggapan.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative w-64">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Cari kata..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button variant="outline" onClick={openCreateModal} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Tambah Kata
                            </Button>
                            <Button onClick={() => setIsBulkOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Tambah Banyak
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Daftar Kata Terlarang</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kata</TableHead>
                                            <TableHead>Mode Pencocokan</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="w-[110px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredWords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                    Belum ada kata terlarang.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredWords.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-mono text-sm">{item.word}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.match_type === 'anywhere' ? 'default' : 'secondary'}>
                                                            {item.match_type === 'anywhere' ? 'Di mana saja' : 'Kata utuh'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={item.is_active}
                                                            onCheckedChange={() => handleToggle(item)}
                                                            aria-label={`Ubah status ${item.word}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEditModal(item)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openDeleteModal(item)}
                                                            >
                                                                Hapus
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <p className="text-muted-foreground mt-3 text-xs">
                                    Kata dengan panjang 5 huruf atau lebih default menggunakan mode{' '}
                                    <em>Di mana saja</em> (cocok di seluruh teks, termasuk yang menempel).
                                    Kata pendek (4 huruf atau kurang) default menggunakan mode{' '}
                                    <em>Kata utuh</em> (hanya cocok sebagai kata tersendiri).
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <SensorFormDialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            if (!open) closeCreateModal();
                        }}
                        mode="create"
                        data={createForm.data}
                        setData={createForm.setData}
                        errors={createForm.errors}
                        processing={createForm.processing}
                        onSubmit={handleCreateSubmit}
                    />
                    <SensorFormDialog
                        open={isEditOpen}
                        onOpenChange={(open) => {
                            if (!open) closeEditModal();
                        }}
                        mode="edit"
                        data={editForm.data}
                        setData={editForm.setData}
                        errors={editForm.errors}
                        processing={editForm.processing}
                        editingId={editingWord?.id ?? null}
                        onSubmit={handleEditSubmit}
                    />
                    <SensorDeleteDialog
                        open={isDeleteOpen}
                        word={deletingWord}
                        onClose={closeDeleteModal}
                        onConfirm={handleDeleteSubmit}
                    />
                    <SensorBulkFormDialog
                        open={isBulkOpen}
                        onOpenChange={setIsBulkOpen}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
