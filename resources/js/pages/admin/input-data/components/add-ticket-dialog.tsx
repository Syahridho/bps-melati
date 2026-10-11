import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { LoaderCircle, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAttachments } from '../hooks/use-attachments';
import { ChannelGroup, ClassificationType, ResponseType } from '../types';
import { AttachmentPreviewDialog } from './attachment-preview-dialog';
import { ResponseFormBlock } from './response-form-block';
import { TicketFormBlock } from './ticket-form-block';

interface AddTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    channels: ChannelGroup[];
    routePrefix: string;
}

export function AddTicketDialog({ open, onOpenChange, channels, routePrefix }: AddTicketDialogProps) {
    const [showResponsePanel, setShowResponsePanel] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const responseRef = useRef<HTMLElement>(null);

    const { handleFileSelection, removeFile } = useAttachments(3, 2 * 1024 * 1024);

    // Bentuk data ini cocok dengan AddTicketFormData; bentuk eksplisit dipakai agar
    // useForm<typename tidak perlu index signature (dilarang oleh FormDataType).
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
                // Beri sedikit jeda agar DOM scroll up/down selaras dengan layout mobile jika berubah
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

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className={cn(
                        'flex max-h-[92dvh] min-h-0 w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 transition-all duration-300',
                        showResponsePanel ? 'lg:max-w-6xl' : 'sm:max-w-2xl',
                    )}
                >
                    <DialogHeader className="bg-background z-20 shrink-0 border-b px-4 py-3 text-left sm:px-6 sm:py-4">
                        <DialogTitle>Tambah Data Baru</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Isi formulir di bawah ini untuk menambahkan tiket pengaduan, aspirasi, atau permintaan informasi.
                        </DialogDescription>
                    </DialogHeader>

                    <form id="input-data-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div
                            ref={bodyRef}
                            className={cn(
                                'custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain',
                                showResponsePanel && 'lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden',
                            )}
                        >
                            <TicketFormBlock
                                data={data}
                                setData={setData}
                                errors={errors}
                                channels={channels}
                                showResponsePanel={showResponsePanel}
                                setShowResponsePanel={toggleResponsePanel}
                                handleFileChange={handleTicketFileChange}
                                removeFile={handleTicketFileRemove}
                                setPreviewFile={setPreviewFile}
                            />

                            {showResponsePanel && (
                                <ResponseFormBlock
                                    ref={responseRef}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    showResponsePanel={showResponsePanel}
                                    handleFileChange={handleResponseFileChange}
                                    removeFile={handleResponseFileRemove}
                                    setPreviewFile={setPreviewFile}
                                />
                            )}
                        </div>

                        <DialogFooter className="bg-background z-20 flex shrink-0 flex-row gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1 sm:flex-none">
                                Batal
                            </Button>
                            <Button type="submit" form="input-data-form" disabled={processing} className="flex-[2] gap-2 sm:flex-none">
                                {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {showResponsePanel ? 'Simpan & Jawab' : 'Kirim'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AttachmentPreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
        </>
    );
}
