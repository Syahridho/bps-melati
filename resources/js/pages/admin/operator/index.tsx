import { OperatorDeleteDialog } from '@/components/operator-delete-dialog';
import { OperatorFormDialog } from '@/components/operator-form-dialog';
import { OperatorTable } from '@/components/operator-table';
import { useOperatorManagement } from '@/hooks/use-operator-management';
import AdminPage from '@/pages/admin/page';
import { type OperatorPageProps } from '@/types/operator';
import { usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

export default function KelolaOperator() {
    const { auth, operators, filters, flash } = usePage<OperatorPageProps>().props;

    const {
        search,
        handleSearchChange,
        handlePerPageChange,
        successMessage,
        isCreateOpen,
        setIsCreateOpen,
        openCreateModal,
        editingOperator,
        setEditingOperator,
        openEditModal,
        deletingOperator,
        setDeletingOperator,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleForceLogout,
        handleDeleteSubmit,
    } = useOperatorManagement(filters.search, filters.per_page, flash?.success);

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
                    onDelete={setDeletingOperator}
                />
            </div>

            {/* Modal Tambah Pengguna */}
            <OperatorFormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                mode="create"
                data={createForm.data}
                setData={createForm.setData}
                errors={createForm.errors}
                processing={createForm.processing}
                onSubmit={handleCreateSubmit}
            />

            {/* Modal Edit Pengguna */}
            <OperatorFormDialog
                open={!!editingOperator}
                onOpenChange={(open) => !open && setEditingOperator(null)}
                mode="edit"
                data={editForm.data}
                setData={editForm.setData}
                errors={editForm.errors}
                processing={editForm.processing}
                onSubmit={handleEditSubmit}
            />

            {/* Modal Hapus Pengguna */}
            <OperatorDeleteDialog operator={deletingOperator} onClose={() => setDeletingOperator(null)} onConfirm={handleDeleteSubmit} />
        </AdminPage>
    );
}
