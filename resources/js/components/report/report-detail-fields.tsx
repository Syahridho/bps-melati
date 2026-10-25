import { FieldError } from '@/components/report/field-error';
import { LabeledField } from '@/components/report/labeled-field';
import type { ReportFormData } from '@/components/report/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CLASSIFICATIONS } from '@/lib/welcome-constants';
import { getTodayDateString } from '@/lib/welcome-utils';
import { useEffect, useState } from 'react';

const TODAY_REFRESH_MS = 60000;

interface ReportDetailFieldsProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
}

export function ReportDetailFields({ data, setData, errors }: ReportDetailFieldsProps) {
    const selectedLabel = CLASSIFICATIONS.find((c) => c.value === data.classification)?.label;
    const [today, setToday] = useState(getTodayDateString);

    useEffect(() => {
        const timer = window.setInterval(() => setToday(getTodayDateString()), TODAY_REFRESH_MS);

        return () => window.clearInterval(timer);
    }, []);

    const handleTanggalKejadianChange = (value: string) => {
        setData('tanggal_kejadian', value !== '' && value > today ? today : value);
    };

    return (
        <div className="space-y-4">
            {!data.classification ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                    Pilih jenis laporan terlebih dahulu untuk mengisi detailnya.
                </div>
            ) : (
                <>
                    {data.classification === 'pengaduan' && (
                        <LabeledField
                            id="tanggal"
                            label="Tanggal kejadian"
                            hint="Opsional"
                            error={errors.tanggal_kejadian}
                            description={
                                <p id="tanggal-hint" className="text-muted-foreground text-xs">
                                    Pilih tanggal hari ini atau sebelumnya.
                                </p>
                            }
                        >
                            <Input
                                id="tanggal"
                                type="date"
                                max={today}
                                className="w-full"
                                value={data.tanggal_kejadian}
                                onChange={(e) => handleTanggalKejadianChange(e.target.value)}
                                aria-describedby="tanggal-hint"
                            />
                        </LabeledField>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="judul">
                            Judul {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="judul"
                            placeholder={`Tuliskan judul ${selectedLabel?.toLowerCase()} Anda`}
                            autoComplete="off"
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
    );
}
