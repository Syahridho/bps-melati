import { FieldError } from '@/components/report/field-error';
import { InfoHint } from '@/components/report/info-hint';
import type { ReportFormData } from '@/components/report/types';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/welcome-utils';
import { Eye, Paperclip, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';

interface AttachmentFieldProps {
    attachments: File[];
    errors: Partial<Record<keyof ReportFormData | string, string>>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onPreviewFile: (file: File) => void;
    onRemoveFile: (index: number) => void;
}

export function AttachmentField({ attachments, errors, fileInputRef, onFileChange, onPreviewFile, onRemoveFile }: AttachmentFieldProps) {
    const fieldErrors = errors as Record<string, string | undefined>;

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">Lampiran</h3>
                    <InfoHint>Opsional</InfoHint>
                </div>
                <p className="text-muted-foreground text-xs">
                    Maksimal 3 file (PDF, gambar JPG/PNG). Ukuran maks 2MB per file.
                </p>
            </div>

            <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"
                onChange={onFileChange}
            />

            {attachments.length < 3 && (
                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="size-4" />
                    Pilih file lampiran ({attachments.length}/3)
                </Button>
            )}

            {attachments.length > 0 && (
                <div className="space-y-2">
                    {attachments.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="bg-accent/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium">{file.name}</span>
                                <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    title="Pratinjau"
                                    onClick={() => onPreviewFile(file)}
                                >
                                    <Eye className="size-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive size-7"
                                    title="Hapus"
                                    onClick={() => onRemoveFile(index)}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <FieldError message={fieldErrors['attachments']} />
            <FieldError message={fieldErrors['attachments.0']} />
            <FieldError message={fieldErrors['attachments.1']} />
            <FieldError message={fieldErrors['attachments.2']} />
        </div>
    );
}
