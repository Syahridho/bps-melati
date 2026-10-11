import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type PeriodOption } from '@/types/rekap';

interface RekapPeriodFilterProps {
    value: string;
    periods: PeriodOption[];
    onValueChange: (value: string) => void;
    placeholder?: string;
    /** Class pada trigger; default `w-44`. */
    triggerClassName?: string;
}

export function RekapPeriodFilter({
    value,
    periods,
    onValueChange,
    placeholder = 'Pilih periode',
    triggerClassName = 'w-44',
}: RekapPeriodFilterProps) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {periods.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
