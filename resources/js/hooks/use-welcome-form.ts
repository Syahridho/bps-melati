import { type ClassificationType } from '@/types/welcome';
import { warnJenisLaporan } from '@/lib/welcome-utils';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
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
        if (!data.classification) {
            warnJenisLaporan();
            return;
        }
        post(route('tickets.store'), {
            forceFormData: true,
        });
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        const combined = [...data.attachments, ...files].slice(0, 3);
        setData('attachments', combined);

        // Reset input agar bisa pilih file yang sama lagi
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
        fileInputRef,
        previewFile,
        setPreviewFile,
        previewUrl,
        handleSubmit,
        handleFileChange,
        removeFile,
    };
}
