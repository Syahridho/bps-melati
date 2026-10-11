import { useInputDataAttachments } from '@/hooks/use-input-data-attachments';
import { type ClassificationType, type ResponseType } from '@/types/input-data';
import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

interface UseInputDataAddTicketFormOptions {
    routePrefix: string;
    onOpenChange: (open: boolean) => void;
}

export function useInputDataAddTicketForm({ routePrefix, onOpenChange }: UseInputDataAddTicketFormOptions) {
    const [showResponsePanel, setShowResponsePanel] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const responseRef = useRef<HTMLElement>(null);

    const { handleFileSelection, removeFile } = useInputDataAttachments(3, 2 * 1024 * 1024);

    const { data, setData, post, reset, errors, processing } = useForm({
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
        response_type: 'respon_awal' as ResponseType,
        response_message: '',
        attachments: [] as File[],
        response_attachments: [] as File[],
    });

    const handleTicketFileChange = (files: FileList | null) => {
        setData('attachments', handleFileSelection(data.attachments, files));
    };

    const handleTicketFileRemove = (fileToRemove: File) => {
        setData('attachments', removeFile(data.attachments, fileToRemove));
    };

    const handleResponseFileChange = (files: FileList | null) => {
        setData('response_attachments', handleFileSelection(data.response_attachments, files));
    };

    const handleResponseFileRemove = (fileToRemove: File) => {
        setData('response_attachments', removeFile(data.response_attachments, fileToRemove));
    };

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            const firstErrorField = Object.keys(errors)[0];
            let el = document.getElementById(firstErrorField);

            if (!el) {
                if (firstErrorField === 'classification') el = document.getElementById('jenis-laporan-group');
                else if (firstErrorField === 'service_type') el = document.getElementById('service-type');
                else if (firstErrorField === 'tanggal_kejadian') el = document.getElementById('tanggal');
                else if (firstErrorField === 'satuan_tugas') el = document.getElementById('satuan-tugas');
                else if (firstErrorField === 'title') el = document.getElementById('judul');
                else if (firstErrorField === 'content') el = document.getElementById('isi');
                else if (firstErrorField === 'response_type') el = document.getElementById('jenis-tanggapan-group');
                else if (firstErrorField === 'response_message') el = document.getElementById('response-message');
            }

            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 300);
            }
        }
    }, [errors]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const payload = { ...data };
        if (!showResponsePanel) {
            payload.response_message = '';
            payload.response_attachments = [];
        }

        post(route(`${routePrefix}.input-data.store`), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowResponsePanel(false);
                onOpenChange(false);
            },
            onError: () => {
                if (errors.response_message || errors.response_attachments || errors.response_type) {
                    setShowResponsePanel(true);
                }
            },
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            if (showResponsePanel && (data.response_message.trim() !== '' || data.response_attachments.length > 0)) {
                if (!window.confirm('Anda memiliki tanggapan yang belum disimpan. Yakin ingin menutup?')) {
                    return;
                }
            }
        }
        onOpenChange(newOpen);
        if (!newOpen) {
            setShowResponsePanel(false);
            reset();
        }
    };

    const toggleResponsePanel = (val: boolean) => {
        if (!val && (data.response_message.trim() !== '' || data.response_attachments.length > 0)) {
            if (!window.confirm('Pesan tanggapan dan lampirannya akan dihapus. Lanjutkan?')) {
                return;
            }
        }
        setShowResponsePanel(val);
        if (val) {
            setTimeout(() => {
                if (window.innerWidth < 1024 && responseRef.current) {
                    responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }
    };

    return {
        data,
        setData,
        errors,
        processing,
        showResponsePanel,
        setShowResponsePanel: toggleResponsePanel,
        previewFile,
        setPreviewFile,
        responseRef,
        handleTicketFileChange,
        handleTicketFileRemove,
        handleResponseFileChange,
        handleResponseFileRemove,
        handleSubmit,
        handleOpenChange,
    };
}
