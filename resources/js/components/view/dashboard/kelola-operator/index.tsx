import { OperatorTable } from '@/components/operator/operator-table';
import { Button } from '@/components/ui/button';
import OperatorFormDialog from '@/components/view/dashboard/kelola-operator/modal-add-operator';
import OperatorDeleteDialog from '@/components/view/dashboard/kelola-operator/modal-delete-operator';
import OperatorFormDialogUpdate from '@/components/view/dashboard/kelola-operator/modal-update-operator';
import { useOperatorManagement } from '@/hooks/use-operator-management';
import { useOperatorPresence } from '@/hooks/use-operator-presence';
import AdminPage from '@/layouts/dashboard/page';
import { type OperatorPageProps } from '@/types/operator';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function KelolaOperatorView() {
    const { auth, operators, filters, flash } = usePage<OperatorPageProps>().props;

    const {
        search,
        handleSearchChange,
        handlePerPageChange,
        handleRolesChange,
        successMessage,
        isCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        deletingOperator,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleForceLogout,
        handleDeleteSubmit,
    } = useOperatorManagement(filters.search, filters.per_page, filters.roles, flash?.success);

    const { operators: realtimeOperators } = useOperatorPresence(operators.data, auth.user.role === 'admin');

    const displayOperators = useMemo(
        () => ({
            ...operators,
            data: realtimeOperators,
        }),
        [operators, realtimeOperators],
    );

    useEffect(() => {
        if (!isCreateOpen && !isEditOpen && !isDeleteOpen) {
            if (document.body.style.pointerEvents === 'none') {
                document.body.style.pointerEvents = '';
            }
        }
    }, [isCreateOpen, isEditOpen, isDeleteOpen]);

    useEffect(() => {
        return () => {
            if (document.body.style.pointerEvents === 'none') {
                document.body.style.pointerEvents = '';
            }
        };
    }, []);

    return (
        <AdminPage
            // title="Kelola Pengguna & Operator"
            // description="Manajemen akun admin dan operator untuk pengelolaan laporan dan data sistem Melati"
            breadcrumbs={[{ title: 'Kelola Operator', href: route('dashboard.admin.operator.index') }]}
        >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Input Data</h2>
                    <p className="text-muted-foreground text-sm">Kelola dan tambahkan laporan, aspirasi, atau permintaan informasi baru.</p>
                </div>
                <Button onClick={openCreateModal} className="shrink-0 gap-2">
                    <UserPlus className="h-4 w-4" />
                    Tambah Pengguna Baru
                </Button>
            </div>
            <div className="space-y-6">
                {/* Alert Pesan Sukses */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <OperatorTable
                    operators={displayOperators}
                    authUserId={auth.user.id}
                    search={search}
                    roles={filters.roles}
                    availableRoles={filters.available_roles}
                    onSearchChange={handleSearchChange}
                    onRolesChange={handleRolesChange}
                    onPerPageChange={handlePerPageChange}
                    onEdit={openEditModal}
                    onForceLogout={handleForceLogout}
                    onDelete={openDeleteModal}
                />
            </div>

            {/* Modal Tambah Pengguna */}
            <OperatorFormDialog
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

            {/* Modal Edit Pengguna */}
            <OperatorFormDialogUpdate
                open={isEditOpen}
                onOpenChange={(open) => {
                    if (!open) closeEditModal();
                }}
                mode="edit"
                data={editForm.data}
                setData={editForm.setData}
                errors={editForm.errors}
                processing={editForm.processing}
                onSubmit={handleEditSubmit}
            />

            {/* Modal Hapus Pengguna */}
            <OperatorDeleteDialog open={isDeleteOpen} operator={deletingOperator} onClose={closeDeleteModal} onConfirm={handleDeleteSubmit} />
        </AdminPage>
    );
}
