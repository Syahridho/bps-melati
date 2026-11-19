import { type CensoredWordItem, type SensorFormData } from '@/types/settings';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function useSensorManagement(flashSuccess?: string) {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const flashSuccessRef = useRef<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingWord, setEditingWord] = useState<CensoredWordItem | null>(null);
    const [deletingWord, setDeletingWord] = useState<CensoredWordItem | null>(null);

    const createForm = useForm<SensorFormData>({
        word: '',
        match_type: 'anywhere',
        is_active: true,
    });

    const editForm = useForm<SensorFormData>({
        word: '',
        match_type: 'anywhere',
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

    const emptyForm: SensorFormData = { word: '', match_type: 'anywhere', is_active: true };

    const defaultMatchType = (word: string): 'anywhere' | 'whole_word' => (word.length >= 5 ? 'anywhere' : 'whole_word');

    const openCreateModal = () => {
        createForm.setData({ ...emptyForm, match_type: 'anywhere', is_active: true });
        createForm.clearErrors();
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        createForm.clearErrors();
    };

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(route('settings.sensors.store'), {
            onSuccess: () => {
                createForm.reset();
                closeCreateModal();
                toast.success('Berhasil menambah kata terlarang');
            },
        });
    };

    const openEditModal = (word: CensoredWordItem) => {
        setEditingWord(word);
        editForm.setData({
            word: word.word,
            match_type: word.match_type,
            is_active: word.is_active,
        });
        editForm.clearErrors();
        setIsEditOpen(true);
    };

    const closeEditModal = () => {
        setIsEditOpen(false);
        setTimeout(() => {
            setEditingWord(null);
            editForm.clearErrors();
        }, 200);
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingWord) return;
        editForm.put(route('settings.sensors.update', editingWord.id), {
            onSuccess: () => {
                editForm.reset();
                closeEditModal();
                toast.success('Berhasil memperbarui kata terlarang');
            },
        });
    };

    const openDeleteModal = (word: CensoredWordItem) => {
        setDeletingWord(word);
        setIsDeleteOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteOpen(false);
        setTimeout(() => setDeletingWord(null), 200);
    };

    const handleDeleteSubmit = () => {
        if (!deletingWord) return;
        router.delete(route('settings.sensors.destroy', deletingWord.id), {
            onSuccess: () => {
                closeDeleteModal();
                toast.success('Berhasil menghapus kata terlarang');
            },
        });
    };

    const handleToggle = (word: CensoredWordItem) => {
        router.patch(
            route('settings.sensors.toggle', word.id),
            {},
            {
                onSuccess: () => {
                    toast.success(`Kata ${word.word} berhasil ${word.is_active ? 'dinonaktifkan' : 'diaktifkan'}!`);
                },
            },
        );
    };

    return {
        successMessage,
        isCreateOpen,
        setIsCreateOpen,
        openCreateModal,
        closeCreateModal,
        isEditOpen,
        setIsEditOpen,
        editingWord,
        openEditModal,
        closeEditModal,
        isDeleteOpen,
        setIsDeleteOpen,
        deletingWord,
        openDeleteModal,
        closeDeleteModal,
        createForm,
        editForm,
        handleCreateSubmit,
        handleEditSubmit,
        handleDeleteSubmit,
        handleToggle,
        defaultMatchType,
    };
}
