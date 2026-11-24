import { FieldError } from '@/components/atoms/field-error';
import { LabeledField } from '@/components/molecules/labeled-field';
import type { ReportFormData } from '@/components/organisms/report/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CLASSIFICATIONS } from '@/lib/welcome-constants';
import { getTodayDateString } from '@/lib/welcome-utils';
import { useEffect, useRef, useState } from 'react';

const TODAY_REFRESH_MS = 60000;

interface ReportDetailFieldsProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
}

export function ReportDetailFields({ data, setData, errors }: ReportDetailFieldsProps) {
    const selectedLabel = CLASSIFICATIONS.find((c) => c.value === data.classification)?.label;
    const [today, setToday] = useState(getTodayDateString);
    const dateRef = useRef<HTMLInputElement>(null);

    const openPicker = () => {
        try {
            dateRef.current?.showPicker();
        } catch (e) {
            void e;
        }
    };

    useEffect(() => {
        const timer = window.setInterval(() => setToday(getTodayDateString()), TODAY_REFRESH_MS);

        return () => window.clearInterval(timer);
    }, []);

    const handleTanggalKejadianChange = (value: string) => {
        setData('tanggal_kejadian', value !== '' && value > today ? today : value);
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            {!data.classification ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm sm:p-6">
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
                                ref={dateRef}
                                id="tanggal"
                                type="date"
                                max={today}
                                className="h-11 w-full cursor-pointer md:h-10"
                                value={data.tanggal_kejadian}
                                onChange={(e) => handleTanggalKejadianChange(e.target.value)}
                                onClick={openPicker}
                                aria-describedby="tanggal-hint"
                            />
                        </LabeledField>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="judul">
                            Judul {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            className="h-11 md:h-10"
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
                            className="min-h-[120px] sm:min-h-[160px]"
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
