import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AttachmentField } from '@/pages/admin/input-data/components/attachment-field';
import { useAttachments } from '@/pages/admin/input-data/hooks/use-attachments';
import { useForm } from '@inertiajs/react';
import { LoaderCircle, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConflictBanner } from './conflict-banner';
import { type ReplyConflict } from './realtime-types';
import { type Status } from './types';

const DOUBLE_SUBMIT_WINDOW_MS = 1000;

function newIdempotencyKey(): string {
    return window.crypto.randomUUID();
}

interface ReplyFormProps {
    ticketId: number;
    ticketStatus: Status;
    expectedVersion: number;
    hasResponAwal: boolean;
    routePrefix: string;
    open: boolean;
    /** Balasan baru dari petugas lain yang masuk sebelum pengguna menekan Kirim. */
    pendingNotice: string | null;
    conflict: ReplyConflict | null;
    onDismissConflict: () => void;
    onCancel: () => void;
    onSuccess: () => void;
    onPreviewFile: (file: File) => void;
    onTyping: () => void;
}

export function ReplyForm({
    ticketId,
    ticketStatus,
    expectedVersion,
    hasResponAwal,
    routePrefix,
    open,
    pendingNotice,
    conflict,
    onDismissConflict,
    onCancel,
    onSuccess,
    onPreviewFile,
    onTyping,
}: ReplyFormProps) {
    const defaultType = hasResponAwal || ticketStatus !== 'baru' ? 'respon_substantif' : 'respon_awal';
    const formRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastSubmitAt = useRef(0);
    const { handleFileSelection, removeFile } = useAttachments();

    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        response_type: defaultType,
        response_message: '',
        response_attachments: [] as File[],
        idempotency_key: idempotencyKey,
        expected_version: expectedVersion,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        // Kunci baru setiap kali form dibuka: draft yang gagal terkirim (mis. 409)
        // tidak akan terbawa ke percobaan berikutnya.
        const key = newIdempotencyKey();
        setIdempotencyKey(key);

        setData({
            response_type: defaultType,
            response_message: '',
            response_attachments: [],
            idempotency_key: key,
            expected_version: expectedVersion,
        });
        clearErrors();
        onDismissConflict();

        const timer = window.setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            textareaRef.current?.focus();
        }, 50);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat form dibuka
    }, [open]);

    // Konflik 409: draft tetap utuh, hanya jenis tanggapan yang disiapkan ulang.
    useEffect(() => {
        if (conflict?.code === 'already_responded' && data.response_type === 'respon_awal') {
            setData('response_type', 'respon_substantif');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat konflik berubah
    }, [conflict]);

    const handleChange = useCallback(
        (value: string) => {
            setData('response_message', value);
            onTyping();
        },
        [setData, onTyping],
    );

    if (!open) {
        return null;
    }

    const handleSubmit = () => {
        // Guard double click / koneksi lambat: abaikan submit kedua dalam < 1 detik.
        const now = Date.now();
        if (processing || now - lastSubmitAt.current < DOUBLE_SUBMIT_WINDOW_MS) {
            return;
        }
        lastSubmitAt.current = now;

        post(route(`${routePrefix}.laporan-masuk.responses.store`, { ticket: ticketId }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                // Kunci baru supaya percobaan berikutnya tidak tertabrak replay.
                setIdempotencyKey(newIdempotencyKey());
                reset();
                onDismissConflict();
                onSuccess();
                toast.success('Tanggapan berhasil dikirim', {
                    description: 'Status laporan diperbarui dan notifikasi diantrikan ke pelapor.',
                });
            },
            onError: (formErrors) => {
                // Sengaja tidak reset(): draft harus tetap utuh saat konflik atau error.
                const firstError = Object.values(formErrors)[0];
                toast.error('Gagal mengirim tanggapan', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                });
            },
        });
    };

    const handleCancel = () => {
        reset();
        clearErrors();
        onDismissConflict();
        onCancel();
    };

    return (
        <div ref={formRef} className="bg-card animate-in fade-in-0 slide-in-from-top-2 space-y-4 rounded-lg border p-4 duration-200 sm:p-6">
            <div>
                <h3 className="font-semibold">Balas Laporan</h3>
                <p className="text-muted-foreground text-xs">Tanggapan akan dikirim ke pelapor melalui kanal yang tersedia.</p>
            </div>

            {conflict && (
                <ConflictBanner
                    conflict={conflict}
                    onUseSubstantif={() => {
                        setData('response_type', 'respon_substantif');
                        clearErrors('response_message');
                    }}
                />
            )}

            {pendingNotice !== null && conflict === null && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                    {pendingNotice} Periksa dulu sebelum mengirim. Draft Anda tetap tersimpan.
                </div>
            )}

            <div className="space-y-2">
                <Label>
                    Jenis Tanggapan <span className="text-destructive">*</span>
                </Label>
                <ToggleGroup
                    type="single"
                    value={data.response_type}
                    onValueChange={(val) => {
                        if (val) setData('response_type', val);
                    }}
                    className="flex flex-wrap justify-start gap-2"
                >
                    <ToggleGroupItem value="respon_awal" variant="outline" className="px-3 py-1.5 text-xs font-medium">
                        Respon Awal
                    </ToggleGroupItem>
                    <ToggleGroupItem value="respon_substantif" variant="outline" className="px-3 py-1.5 text-xs font-medium">
                        Respon Substantif
                    </ToggleGroupItem>
                </ToggleGroup>
                {errors.response_type && <p className="text-destructive text-xs">{errors.response_type}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="reply-message">
                    Pesan Tanggapan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                    ref={textareaRef}
                    id="reply-message"
                    rows={5}
                    className="text-base sm:text-sm"
                    placeholder="Tuliskan pesan tanggapan yang akan dikirimkan kepada pelapor..."
                    value={data.response_message}
                    onChange={(e) => handleChange(e.target.value)}
                />
                {errors.response_message && <p className="text-destructive text-xs">{errors.response_message}</p>}
            </div>

            <AttachmentField
                id="reply-attachments"
                label="Lampiran (opsional)"
                description="Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file."
                files={data.response_attachments}
                error={errors.response_attachments}
                onChange={(files) => setData('response_attachments', handleFileSelection(data.response_attachments, files))}
                onRemove={(file) => setData('response_attachments', removeFile(data.response_attachments, file))}
                onPreview={onPreviewFile}
            />

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel} disabled={processing}>
                    Batal
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={handleSubmit} disabled={processing}>
                    {processing ? (
                        <>
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            Mengirim...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 size-4" />
                            Kirim Balasan
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
