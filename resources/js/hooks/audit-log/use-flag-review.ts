import axios from 'axios';
import { useState, type FormEvent } from 'react';

import type { ReviewGroup } from '@/types/audit-log';

export function useFlagReview(onSaved: () => void) {
    const [open, setOpen] = useState(false);
    const [group, setGroup] = useState<ReviewGroup | null>(null);
    const [status, setStatus] = useState('ditinjau');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openReview = (g: ReviewGroup) => {
        const current = g.representative.status;
        setGroup(g);
        setStatus(current !== 'baru' ? current : 'ditinjau');
        setNote(g.representative.review_note ?? '');
        setError(null);
        setOpen(true);
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!group) return;
        setSaving(true);
        setError(null);
        try {
            await axios.patch(route('audit-flag.update', { flag: group.representative.id }), { status, note });
            setOpen(false);
            onSaved();
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                const errors = err.response.data.errors ?? {};
                setError(Object.values(errors).flat().join(' ') || 'Data tidak valid');
            } else {
                setError('Gagal menyimpan penanda');
            }
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return { open, setOpen, group, status, setStatus, note, setNote, saving, error, openReview, submit };
}
