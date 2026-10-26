import { type ClassificationType } from '@/types/welcome';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];

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
        post(route('tickets.store'), {
            forceFormData: true,
        });
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        const accepted: File[] = [];

        for (const file of files) {
            const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                toast.error(`File "${file.name}" ditolak. Hanya format PDF, JPG/JPEG, atau PNG yang diizinkan.`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                toast.error(`File "${file.name}" terlalu besar. Ukuran maksimal 2MB per file.`);
                continue;
            }

            accepted.push(file);
        }

        const combined = [...data.attachments, ...accepted];

        if (combined.length > MAX_FILES) {
            toast.error(`Maksimal ${MAX_FILES} file lampiran.`);
        }

        setData('attachments', combined.slice(0, MAX_FILES));

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
