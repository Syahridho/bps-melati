import { type Operator, type OperatorFormData } from '@/types/operator';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function useOperatorManagement(initialSearch: string, perPage: number, flashSuccess?: string) {
    const [search, setSearch] = useState(initialSearch || '');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
    const [deletingOperator, setDeletingOperator] = useState<Operator | null>(null);

    // Form Tambah Operator/User
    const createForm = useForm<OperatorFormData>({
        name: '',
        role: 'operator',
        email: '',
        password: '',
    });

    // Form Edit Operator/User
    const editForm = useForm<OperatorFormData>({
        name: '',
        role: 'operator',
        email: '',
        password: '',
    });

    useEffect(() => {
        if (flashSuccess) {
            setSuccessMessage(flashSuccess);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flashSuccess]);

    // Live search handler
    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(route('dashboard.admin.operator.index'), { search: value, per_page: perPage }, { preserveState: true, replace: true });
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(route('dashboard.admin.operator.index'), { search, per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const handleForceLogout = (target: Operator) => {
        router.post(
            route('dashboard.admin.operator.force-logout', { operator: target.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Sesi ${target.name} telah diakhiri.`),
                onError: () => toast.error('Gagal mengakhiri sesi pengguna.'),
            },
        );
    };

    const openCreateModal = () => {
        createForm.reset();
        createForm.clearErrors();
        setIsCreateOpen(true);
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

    // Action: Delete Operator/User
    const handleDeleteSubmit = () => {
        if (!deletingOperator) return;

        router.delete(route('dashboard.admin.operator.destroy', deletingOperator.id), {
            onSuccess: () => {
                setDeletingOperator(null);
            },
        });
    };

    return {
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
    };
}
