import { FieldError } from '@/components/report/field-error';
import { InfoHint } from '@/components/report/info-hint';
import { AttachmentDropzone } from '@/components/attachment-dropzone';
import type { ReportFormData } from '@/components/report/types';

interface AttachmentFieldProps {
    attachments: File[];
    onChange: (files: File[]) => void;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
    onRemoveFile: (index: number) => void;
    onPreviewFile: (file: File) => void;
}

export function AttachmentField({
    attachments,
    onChange,
    errors,
    onRemoveFile,
    onPreviewFile,
}: AttachmentFieldProps) {
    const fieldErrors = errors as Record<string, string | undefined>;

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">Lampiran</h3>
                    <InfoHint>Opsional</InfoHint>
                </div>
                <p className="text-muted-foreground text-xs">
                    Maksimal 3 file. Format yang diizinkan: PDF, JPG/JPEG,
                    atau PNG. Ukuran maks 2MB per file.
                </p>
            </div>

            <AttachmentDropzone
                files={attachments}
                onChange={onChange}
                onRemoveFile={onRemoveFile}
                onPreviewFile={onPreviewFile}
                error={fieldErrors['attachments'] ?? null}
            />

            <FieldError message={fieldErrors['attachments']} />
            <FieldError message={fieldErrors['attachments.0']} />
            <FieldError message={fieldErrors['attachments.1']} />
            <FieldError message={fieldErrors['attachments.2']} />
        </div>
    );
}
