import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardPeriodFilterProps {
    period: string;
    month: string | number;
    year: string | number;
    years: Array<{ value: string; label: string }>;
    months: Array<{ value: string; label: string; disabled?: boolean }>;
    onChange: (next: { period: string; month?: string | number; year?: string | number }) => void;
}

const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'Bulan Ini' },
    { value: 'last_month', label: 'Bulan Lalu' },
    { value: 'this_year', label: 'Tahun Ini' },
    { value: 'custom', label: 'Pilih Bulan' },
];

export function DashboardPeriodFilter({
    period,
    month,
    year,
    years,
    months,
    onChange,
}: DashboardPeriodFilterProps) {
    const normalizedPeriod = PERIOD_OPTIONS.some((o) => o.value === period) ? period : 'this_month';

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select
                value={normalizedPeriod}
                onValueChange={(value) => onChange({ period: value, month, year })}
            >
                <SelectTrigger className="w-40 bg-background" aria-label="Periode">
                    <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {normalizedPeriod === 'custom' && (
                <>
                    <Select
                        value={String(month)}
                        onValueChange={(value) => onChange({ period: 'custom', month: value, year })}
                    >
                        <SelectTrigger className="w-36 bg-background" aria-label="Bulan">
                            <SelectValue placeholder="Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value} disabled={m.disabled}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={String(year)}
                        onValueChange={(value) => onChange({ period: 'custom', month, year: value })}
                    >
                        <SelectTrigger className="w-28 bg-background" aria-label="Tahun">
                            <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y.value} value={y.value}>
                                    {y.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </>
            )}
        </div>
    );
}
