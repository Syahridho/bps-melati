import { type Operator, type OperatorFormData } from '@/types/operator';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function useOperatorManagement(
    initialSearch: string,
    perPage: number,
    initialRoles: string[],
    flashSuccess?: string
) {
    const [search, setSearch] = useState(initialSearch || '');
    const [roles, setRoles] = useState(initialRoles ?? []);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const flashSuccessRef = useRef<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
        const message = flashSuccess ?? null;
        if (!message || message === flashSuccessRef.current) {
            return;
        }

        if (flashTimerRef.current !== null) {
            window.clearTimeout(flashTimerRef.current);
        }

        flashSuccessRef.current = message;
        setSuccessMessage(message);
        flashTimerRef.current = window.setTimeout(() => {
            setSuccessMessage(null);
            flashSuccessRef.current = null;
            flashTimerRef.current = null;
        }, 5000);

        return () => {
            if (flashTimerRef.current !== null) {
                window.clearTimeout(flashTimerRef.current);
                flashTimerRef.current = null;
            }
        };
    }, [flashSuccess]);

    const queryParams = (extra: Record<string, unknown> = {}): Record<string, string | number | boolean | null | undefined | string[]> => {
        const params: Record<string, string | number | boolean | null | undefined | string[]> = { ...(extra as Record<string, string | number | boolean | null | undefined | string[]>) };
        if (Array.isArray(params.roles) && params.roles.length === 0) {
            delete params.roles;
        }
        return params;
    };

    // Live search handler
    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(route('dashboard.admin.operator.index'), queryParams({ search: value, roles, per_page: perPage }), { preserveState: true, replace: true });
    };

    const handleRolesChange = (newRoles: string[]) => {
        setRoles(newRoles);
        router.get(route('dashboard.admin.operator.index'), queryParams({ search, roles: newRoles, per_page: perPage, page: 1 }), { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(route('dashboard.admin.operator.index'), queryParams({ search, roles, per_page: newPerPage }), { preserveState: true, replace: true });
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

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        createForm.clearErrors();
    };

    // Form Submit: Tambah Operator/User
    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(route('dashboard.admin.operator.store'), {
            onSuccess: () => {
                createForm.reset();
                closeCreateModal();
                toast.success('Berhasil membuat user baru');
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
        setIsEditOpen(true);
    };

    const closeEditModal = () => {
        setIsEditOpen(false);
        setTimeout(() => {
            setEditingOperator(null);
            editForm.clearErrors();
        }, 200);
    };

    // Form Submit: Edit Operator/User
    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingOperator) return;

        editForm.put(route('dashboard.admin.operator.update', editingOperator.id), {
            onSuccess: () => {
                editForm.reset();
                closeEditModal();
                toast.success('Berhasil memperbarui user');
            },
        });
    };

    // Action: Delete Operator/User
    const openDeleteModal = (op: Operator) => {
        setDeletingOperator(op);
        setIsDeleteOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteOpen(false);
        setTimeout(() => {
            setDeletingOperator(null);
        }, 200);
    };

    const handleDeleteSubmit = () => {
        if (!deletingOperator) return;

        router.delete(route('dashboard.admin.operator.destroy', deletingOperator.id), {
            onSuccess: () => {
                closeDeleteModal();
                toast.success('Berhasil menghapus user');
            },
        });
    };

    return {
        search,
        handleSearchChange,
        handlePerPageChange,
        roles,
        handleRolesChange,
        successMessage,
        isCreateOpen,
        setIsCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        setIsEditOpen,
        editingOperator,
        setEditingOperator,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        setIsDeleteOpen,
        deletingOperator,
        setDeletingOperator,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleForceLogout,
        handleDeleteSubmit,
    };
}
