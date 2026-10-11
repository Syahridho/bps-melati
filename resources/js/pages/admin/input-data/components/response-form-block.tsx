import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { forwardRef, useEffect, useRef } from 'react';
import { type AddTicketFormData, type ResponseType, type SetTicketFormField } from '../types';
import { AttachmentField } from './attachment-field';

interface ResponseFormBlockProps {
    data: AddTicketFormData;
    setData: SetTicketFormField;
    errors: Record<string, string>;
    showResponsePanel: boolean;
    handleFileChange: (files: FileList | null) => void;
    removeFile: (file: File) => void;
    setPreviewFile: (file: File) => void;
}

export const ResponseFormBlock = forwardRef<HTMLElement, ResponseFormBlockProps>(
    ({ data, setData, errors, showResponsePanel, handleFileChange, removeFile, setPreviewFile }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        useEffect(() => {
            if (showResponsePanel && textareaRef.current) {
                textareaRef.current.focus();
            }
        }, [showResponsePanel]);

        if (!showResponsePanel) return null;

        return (
            <section
                ref={ref}
                className="bg-muted custom-scrollbar flex flex-col border-t [scrollbar-gutter:stable] lg:min-h-0 lg:overflow-y-auto lg:border-t-0"
            >
                <div className="bg-muted border-b px-4 py-3 sm:px-6 sm:py-4 lg:sticky lg:top-0 lg:z-20">
                    <h3 className="text-sm font-semibold">2. Forward / Jawab Laporan</h3>
                    <p className="text-muted-foreground text-xs">Isi tanggapan atau instruksi forward yang akan disimpan bersama laporan ini.</p>
                </div>

                <div className="flex flex-1 flex-col space-y-4 p-4 sm:space-y-5 sm:p-6">
                    {/* Jenis Tanggapan */}
                    <div className="space-y-2" id="jenis-tanggapan-group">
                        <Label>
                            Jenis Tanggapan <span className="text-destructive">*</span>
                        </Label>
                        <ToggleGroup
                            type="single"
                            value={data.response_type}
                            onValueChange={(val) => {
                                if (val) setData('response_type', val as ResponseType);
                            }}
                            className="flex-wrap justify-start gap-2"
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

                    {/* Pesan Tanggapan */}
                    <div className="space-y-2">
                        <Label htmlFor="response-message">
                            Pesan Tanggapan / Forward <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            ref={textareaRef}
                            id="response-message"
                            className="text-base sm:text-sm"
                            placeholder="Tuliskan isi balasan langsung, tanggapan, atau instruksi forward laporan di sini..."
                            rows={6}
                            value={data.response_message}
                            onChange={(e) => setData('response_message', e.target.value)}
                            required={showResponsePanel}
                        />
                        {errors.response_message && <p className="text-destructive text-xs">{errors.response_message}</p>}
                    </div>

                    {/* Lampiran Tanggapan / Forward */}
                    <AttachmentField
                        id="response-attachments"
                        label="Lampiran Tanggapan / Forward (opsional)"
                        description="Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file."
                        files={data.response_attachments}
                        error={errors.response_attachments}
                        onChange={handleFileChange}
                        onRemove={removeFile}
                        onPreview={setPreviewFile}
                    />
                </div>
            </section>
        );
    },
);

ResponseFormBlock.displayName = 'ResponseFormBlock';
