import { OperatorTable } from '@/components/operator/operator-table';
import OperatorFormDialog from '@/components/view/dashboard/kelola-operator/modal-add-operator';
import OperatorDeleteDialog from '@/components/view/dashboard/kelola-operator/modal-delete-operator';
import OperatorFormDialogUpdate from '@/components/view/dashboard/kelola-operator/modal-update-operator';
import { useOperatorManagement } from '@/hooks/use-operator-management';
import AdminPage from '@/layouts/dashboard/page';
import { type OperatorPageProps } from '@/types/operator';
import { usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

export default function KelolaOperatorView() {
    const { auth, operators, filters, flash } = usePage<OperatorPageProps>().props;

    const {
        search,
        handleSearchChange,
        handlePerPageChange,
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
    } = useOperatorManagement(filters.search, filters.per_page, flash?.success);

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

                <OperatorTable
                    operators={operators}
                    authUserId={auth.user.id}
                    search={search}
                    onSearchChange={handleSearchChange}
                    onPerPageChange={handlePerPageChange}
                    onOpenCreate={openCreateModal}
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
            <OperatorDeleteDialog
                open={isDeleteOpen}
                operator={deletingOperator}
                onClose={closeDeleteModal}
                onConfirm={handleDeleteSubmit}
            />
        </AdminPage>
    );
}
