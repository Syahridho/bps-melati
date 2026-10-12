import { AttachmentField } from '@/components/report/attachment-field';
import { ClassificationSelector } from '@/components/report/classification-selector';
import { ReportDetailFields } from '@/components/report/report-detail-fields';
import { ReporterFields } from '@/components/report/reporter-fields';
import { type ReportFormProps } from '@/components/report/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';

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
    return (
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl min-w-0">
            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle>Formulir Laporan</CardTitle>
                    <CardDescription>Pilih jenis laporan, lalu lengkapi detailnya.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Jenis laporan */}
                    <ClassificationSelector value={data.classification} onChange={(v) => setData('classification', v)} />

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
                </CardContent>

                <CardFooter className="flex justify-end gap-3 pt-6">
                    <Button type="submit" disabled={processing || !data.classification} className="w-full sm:w-auto">
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        Kirim Laporan
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
