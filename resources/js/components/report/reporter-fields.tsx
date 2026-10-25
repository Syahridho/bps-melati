import { LabeledField } from '@/components/report/labeled-field';
import type { ReportFormData } from '@/components/report/types';
import { Input } from '@/components/ui/input';

interface ReporterFieldsProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
}

export function ReporterFields({ data, setData, errors }: ReporterFieldsProps) {
    return (
        <div className="!mb-4 space-y-4">
            <LabeledField id="nama" label="Nama" hint="Opsional" error={errors.reporter_name}>
                <Input
                    id="nama"
                    placeholder="Masukkan nama"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={data.reporter_name}
                    onChange={(e) => setData('reporter_name', e.target.value)}
                />
            </LabeledField>
            <LabeledField id="email" label="Email" hint="Opsional" error={errors.reporter_email}>
                <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={data.reporter_email}
                    onChange={(e) => setData('reporter_email', e.target.value)}
                />
            </LabeledField>
            <LabeledField id="wa" label="WhatsApp" hint="Opsional" error={errors.reporter_wa}>
                <Input
                    id="wa"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="08********"
                    autoComplete="off"
                    value={data.reporter_wa}
                    onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                />
            </LabeledField>
        </div>
    );
}
