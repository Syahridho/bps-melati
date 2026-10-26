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
        <form onSubmit={handleFormSubmit} autoComplete="off" className="relative mx-auto w-full max-w-2xl min-w-0">
            {/* soft glow pooled beneath the card so it reads as floating on the band; dissolves gradually below (decorative) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-8 top-10 -bottom-32 -z-10 [background-image:radial-gradient(52%_55%_at_50%_62%,rgba(0,95,182,0.11),transparent_100%)] [mask-image:linear-gradient(to_bottom,black_30%,black_70%,transparent_98%)] dark:[background-image:radial-gradient(52%_55%_at_50%_62%,rgba(28,118,225,0.18),transparent_100%)]"
            />
            <div className="shadow-primary/10 dark:shadow-primary/20 rounded-lg [background-image:linear-gradient(160deg,rgba(0,95,182,0.5),rgba(0,95,182,0.12)_30%,rgba(0,95,182,0.05)_55%,rgba(0,95,182,0.02)_100%)] p-px shadow-lg dark:[background-image:linear-gradient(160deg,rgba(64,150,255,0.55),rgba(64,150,255,0.12)_30%,rgba(64,150,255,0.05)_55%,rgba(64,150,255,0.03)_100%)]">
                <Card className="bg-card/85 dark:bg-card/80 rounded-[7px] border-0 shadow-none backdrop-blur-sm">
                    <CardHeader className="from-primary/5 dark:from-primary/[0.09] rounded-t-[6px] bg-gradient-to-b to-transparent">
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
                        <Button type="submit" disabled={processing} className={cn('w-full sm:w-auto', !data.classification && 'opacity-60')}>
                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            Kirim Laporan
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </form>
    );
}
