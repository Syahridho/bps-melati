import { LabeledField } from '@/components/report/labeled-field';
import type { ReportFormData } from '@/components/report/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { warnJenisLaporan } from '@/lib/welcome-utils';

interface ReporterFieldsProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
}

export function ReporterFields({ data, setData, errors }: ReporterFieldsProps) {
    const terkunci = !data.classification;

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        if (terkunci) {
            warnJenisLaporan();
            e.currentTarget.blur();
        }
    };

    return (
        <div className="!mb-4 space-y-4">
            <LabeledField id="nama" label="Nama" hint="Opsional" error={errors.reporter_name}>
                <Input
                    id="nama"
                    placeholder="Masukkan nama"
                    value={data.reporter_name}
                    onChange={(e) => setData('reporter_name', e.target.value)}
                    readOnly={terkunci}
                    aria-disabled={terkunci}
                    tabIndex={terkunci ? -1 : 0}
                    onFocus={handleInputFocus}
                    className={cn(terkunci && 'opacity-60 cursor-not-allowed select-none bg-muted/50')}
                />
            </LabeledField>
            <LabeledField id="email" label="Email" hint="Opsional" error={errors.reporter_email}>
                <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={data.reporter_email}
                    onChange={(e) => setData('reporter_email', e.target.value)}
                    readOnly={terkunci}
                    aria-disabled={terkunci}
                    tabIndex={terkunci ? -1 : 0}
                    onFocus={handleInputFocus}
                    className={cn(terkunci && 'opacity-60 cursor-not-allowed select-none bg-muted/50')}
                />
            </LabeledField>
            <LabeledField id="wa" label="WhatsApp" hint="Opsional" error={errors.reporter_wa}>
                <Input
                    id="wa"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="08********"
                    value={data.reporter_wa}
                    onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                    readOnly={terkunci}
                    aria-disabled={terkunci}
                    tabIndex={terkunci ? -1 : 0}
                    onFocus={handleInputFocus}
                    className={cn(terkunci && 'opacity-60 cursor-not-allowed select-none bg-muted/50')}
                />
            </LabeledField>
        </div>
    );
}
