import { type ChannelChildItem, type ChannelFormData, type ChannelItem } from '@/types/sumber-kanal';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function useSumberKanalManagement(flashSuccess?: string) {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const flashSuccessRef = useRef<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [, setCreateParentId] = useState<string>('');
    const [editingChannel, setEditingChannel] = useState<ChannelItem | ChannelChildItem | null>(null);
    const [deletingChannel, setDeletingChannel] = useState<ChannelItem | ChannelChildItem | null>(null);

    const createForm = useForm<ChannelFormData>({
        name: '',
        parent_id: '',
        color: '#8b5cf6',
        sort_order: '1',
        is_active: true,
    });

    const editForm = useForm<ChannelFormData>({
        name: '',
        parent_id: '',
        color: '#8b5cf6',
        sort_order: '1',
        is_active: true,
    });

    useEffect(() => {
        const message = flashSuccess ?? null;
        if (!message || message === flashSuccessRef.current) return;
        if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
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

    const emptyForm: ChannelFormData = { name: '', parent_id: '', color: '#8b5cf6', sort_order: '1', is_active: true };

    const openCreateModal = (parentId?: number) => {
        const pid = parentId ? String(parentId) : '';
        createForm.setData({ ...emptyForm, parent_id: pid, sort_order: '1' });
        createForm.clearErrors();
        setCreateParentId(pid);
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        createForm.clearErrors();
    };

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(route('settings.sumber-kanal.store'), {
            // parent_id kosong harus jadi null agar backend slug benar
            onSuccess: () => {
                createForm.reset();
                closeCreateModal();
                toast.success('Berhasil menambah kanal');
            },
        });
    };

    const openEditModal = (channel: ChannelItem | ChannelChildItem) => {
        setEditingChannel(channel);
        const isChild = 'parent_id' in channel && channel.parent_id !== null;
        editForm.setData({
            name: channel.name,
            parent_id: channel.parent_id ? String(channel.parent_id) : '',
            color: (channel.color ?? (isChild ? '#94a3b8' : '#8b5cf6')).toString(),
            sort_order: String(channel.sort_order ?? 1),
            is_active: channel.is_active,
        });
        editForm.clearErrors();
        setIsEditOpen(true);
    };

    const closeEditModal = () => {
        setIsEditOpen(false);
        setTimeout(() => {
            setEditingChannel(null);
            editForm.clearErrors();
        }, 200);
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingChannel) return;
        editForm.put(route('settings.sumber-kanal.update', editingChannel.id), {
            onSuccess: () => {
                editForm.reset();
                closeEditModal();
                toast.success('Berhasil memperbarui kanal');
            },
        });
    };

    const openDeleteModal = (channel: ChannelItem | ChannelChildItem) => {
        setDeletingChannel(channel);
        setIsDeleteOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteOpen(false);
        setTimeout(() => setDeletingChannel(null), 200);
    };

    const handleDeleteSubmit = () => {
        if (!deletingChannel) return;
        router.delete(route('settings.sumber-kanal.destroy', deletingChannel.id), {
            onSuccess: () => {
                closeDeleteModal();
                toast.success('Berhasil menghapus kanal');
            },
        });
    };

    return {
        successMessage,
        isCreateOpen,
        setIsCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        setIsEditOpen,
        editingChannel,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        setIsDeleteOpen,
        deletingChannel,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleDeleteSubmit,
    };
}
