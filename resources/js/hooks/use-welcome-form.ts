import { type ClassificationType } from '@/types/welcome';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

export function useWelcomeForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        classification: '' as ClassificationType | '',
        channel_id: '',
        reporter_name: '',
        reporter_email: '',
        reporter_wa: '',
        title: '',
        content: '',
        service_type: '',
        tanggal_kejadian: '',
        satuan_tugas: '',
        attachments: [] as File[],
    });

    const [previewFile, setPreviewFile] = useState<File | null>(null);

    const previewUrl = useMemo(() => {
        if (!previewFile) {
            return null;
        }
        return URL.createObjectURL(previewFile);
    }, [previewFile]);

    // Revoke object URL saat preview ditutup atau file berubah
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('tickets.store'), {
            forceFormData: true,
        });
    }

    function removeFile(index: number) {
        setData(
            'attachments',
            data.attachments.filter((_, i) => i !== index),
        );
    }

    return {
        data,
        setData,
        processing,
        errors,
        reset,
        previewFile,
        setPreviewFile,
        previewUrl,
        handleSubmit,
        removeFile,
    };
}
