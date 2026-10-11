import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CLASSIFICATIONS } from '@/lib/welcome-constants';
import { formatFileSize } from '@/lib/welcome-utils';
import { type ClassificationType } from '@/types/welcome';
import { CheckCircle2, Circle, Eye, LoaderCircle, Paperclip, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from 'react';

interface ReportFormData {
    classification: ClassificationType | '';
    channel_id: string;
    reporter_name: string;
    reporter_email: string;
    reporter_wa: string;
    title: string;
    content: string;
    service_type: string;
    tanggal_kejadian: string;
    satuan_tugas: string;
    attachments: File[];
}

interface ReportFormProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    processing: boolean;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onSubmit: (e: FormEvent) => void;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onPreviewFile: (file: File) => void;
}

function SectionTitle({ title, description }: { title: ReactNode; description?: string }) {
    return (
        <div className="space-y-0.5">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }
    return <p className="text-destructive text-sm">{message}</p>;
}

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
    const selectedLabel = CLASSIFICATIONS.find((c) => c.value === data.classification)?.label;
    const fieldErrors = errors as Record<string, string | undefined>;

    return (
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl min-w-0">
            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle>Formulir Laporan</CardTitle>
                    <CardDescription>Pilih jenis laporan, lalu lengkapi detailnya.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Jenis laporan */}
                    <div role="radiogroup" aria-labelledby="jenis-label" className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {CLASSIFICATIONS.map((option) => {
                            const selected = data.classification === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setData('classification', option.value)}
                                    className={cn(
                                        'focus-visible:ring-ring/50 flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]',
                                        selected ? 'border-primary bg-primary/5 text-primary ring-primary ring-1' : 'bg-card hover:bg-accent',
                                    )}
                                >
                                    {selected ? (
                                        <CheckCircle2 className="text-primary size-4 shrink-0" />
                                    ) : (
                                        <Circle className="text-muted-foreground size-4 shrink-0" />
                                    )}
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t" />

                    <div className="!mb-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nama">Nama</Label>
                            <Input
                                id="nama"
                                placeholder="Masukkan nama"
                                value={data.reporter_name}
                                onChange={(e) => setData('reporter_name', e.target.value)}
                            />
                            <FieldError message={errors.reporter_name} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nama@email.com"
                                value={data.reporter_email}
                                onChange={(e) => setData('reporter_email', e.target.value)}
                            />
                            <FieldError message={errors.reporter_email} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wa">WhatsApp</Label>
                            <Input
                                id="wa"
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="08********"
                                value={data.reporter_wa}
                                onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                            />
                            <FieldError message={errors.reporter_wa} />
                        </div>
                    </div>

                    {/* Detail laporan */}
                    <div className="space-y-4">
                        {!data.classification ? (
                            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                Pilih jenis laporan terlebih dahulu untuk mengisi detailnya.
                            </div>
                        ) : (
                            <>
                                {data.classification === 'pengaduan' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="tanggal">Tanggal kejadian (opsional)</Label>
                                        <Input
                                            id="tanggal"
                                            type="date"
                                            className="w-full"
                                            value={data.tanggal_kejadian}
                                            onChange={(e) => setData('tanggal_kejadian', e.target.value)}
                                        />
                                        <FieldError message={errors.tanggal_kejadian} />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="judul">
                                        Judul {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="judul"
                                        placeholder={`Tuliskan judul ${selectedLabel?.toLowerCase()} Anda`}
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    <FieldError message={errors.title} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="isi">
                                        Isi {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="isi"
                                        placeholder={`Tuliskan isi ${selectedLabel?.toLowerCase()} Anda`}
                                        rows={6}
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                    />
                                    <FieldError message={errors.content} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="border-t" />

                    {/* Lampiran */}
                    <div className="space-y-3">
                        <SectionTitle title="Lampiran (opsional)" description="Format JPG, PNG, atau PDF. Maksimal 2 MB per file dan 3 file." />

                        {data.attachments.length < 3 && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    multiple
                                    onChange={onFileChange}
                                    className="hidden"
                                    id="file-input"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip className="size-4" />
                                    Pilih file
                                </Button>
                            </div>
                        )}

                        {data.attachments.length > 0 && (
                            <ul className="space-y-2">
                                {data.attachments.map((file, index) => (
                                    <li
                                        key={`${file.name}-${index}`}
                                        className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Paperclip className="text-muted-foreground size-4 shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                            <span className="text-muted-foreground shrink-0 text-xs">({formatFileSize(file.size)})</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground size-7"
                                                title="Lihat"
                                                onClick={() => onPreviewFile(file)}
                                            >
                                                <Eye className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground size-7"
                                                title="Hapus"
                                                onClick={() => onRemoveFile(index)}
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <FieldError message={errors.attachments} />
                        {['attachments.0', 'attachments.1', 'attachments.2'].map((key) => (
                            <FieldError key={key} message={fieldErrors[key]} />
                        ))}
                    </div>
                </CardContent>

                <CardFooter className="border-t pt-6">
                    <Button type="submit" size="lg" className="w-full sm:ml-auto sm:w-auto sm:px-10" disabled={processing || !data.classification}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Kirim laporan
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
