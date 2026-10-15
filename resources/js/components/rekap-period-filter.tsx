import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type PeriodOption } from '@/types/rekap';

interface RekapPeriodFilterProps {
    year: string;
    years: PeriodOption[];
    onYearChange: (year: string) => void;
    monthOrSemester?: string;
    monthOrSemesters?: PeriodOption[];
    onMonthOrSemesterChange?: (val: string) => void;
    secondaryPlaceholder?: string;
    yearTriggerClassName?: string;
    secondaryTriggerClassName?: string;
}

export function RekapPeriodFilter({
    year,
    years,
    onYearChange,
    monthOrSemester,
    monthOrSemesters,
    onMonthOrSemesterChange,
    secondaryPlaceholder = 'Pilih bulan',
    yearTriggerClassName = 'w-36',
    secondaryTriggerClassName = 'w-56',
}: RekapPeriodFilterProps) {
    return (
        <div className="flex items-center gap-2">
            <Select value={year} onValueChange={onYearChange}>
                <SelectTrigger className={yearTriggerClassName}>
                    <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                    {years.map((y) => (
                        <SelectItem key={y.value} value={y.value}>
                            {y.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {monthOrSemesters && onMonthOrSemesterChange && monthOrSemester !== undefined && (
                <Select value={monthOrSemester} onValueChange={onMonthOrSemesterChange}>
                    <SelectTrigger className={secondaryTriggerClassName}>
                        <SelectValue placeholder={secondaryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOrSemesters.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
