import { AttachmentField } from '@/components/report/attachment-field';
import { ClassificationSelector } from '@/components/report/classification-selector';
import { ReportDetailFields } from '@/components/report/report-detail-fields';
import { ReporterFields } from '@/components/report/reporter-fields';
import { type ReportFormProps } from '@/components/report/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';
import { useRef, type FormEvent } from 'react';
import { toast } from 'sonner';

export type { ReportFormData, ReportFormProps } from '@/components/report/types';

export function ReportForm({
    data,
    setData,
    processing,
    errors,
    fileInputRef,
    onSubmit,
    onFileChange,
    onRemoveFile,
    onPreviewFile,
}: ReportFormProps) {
    const typeSectionRef = useRef<HTMLDivElement>(null);

    function ensureTypeSelected() {
        if (data.classification) {
            return true;
        }
        toast.warning('Pilih jenis laporan terlebih dahulu', {
            id: 'pilih-jenis-laporan',
            description: 'Pilih Pengaduan, Aspirasi, atau Permintaan Informasi.',
        });
        typeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!ensureTypeSelected()) return;
        onSubmit(e);
    };

    return (
        <form onSubmit={handleFormSubmit} autoComplete="off" className="mx-auto w-full max-w-2xl min-w-0">
            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle>Formulir Laporan</CardTitle>
                    <CardDescription>Pilih jenis laporan, lalu lengkapi detailnya.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Jenis laporan */}
                    <div ref={typeSectionRef}>
                        <ClassificationSelector value={data.classification} onChange={(v) => setData('classification', v)} />
                    </div>

                    <div
                        onFocusCapture={() => {
                            ensureTypeSelected();
                        }}
                        onClickCapture={() => {
                            ensureTypeSelected();
                        }}
                        className="space-y-8"
                    >
                        {/* Identitas pelapor */}
                        <ReporterFields data={data} setData={setData} errors={errors} />

                        {/* Detail laporan */}
                        <ReportDetailFields data={data} setData={setData} errors={errors} />

                        {/* Lampiran */}
                        <AttachmentField
                            attachments={data.attachments}
                            errors={errors}
                            fileInputRef={fileInputRef}
                            onFileChange={onFileChange}
                            onPreviewFile={onPreviewFile}
                            onRemoveFile={onRemoveFile}
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end gap-3 pt-6">
                    <Button
                        type="submit"
                        disabled={processing}
                        className={cn('w-full sm:w-auto', !data.classification && 'opacity-60')}
                    >
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        Kirim Laporan
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
