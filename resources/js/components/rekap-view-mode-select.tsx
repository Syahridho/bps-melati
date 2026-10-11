import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REKAP_VIEW_MODE_OPTIONS } from '@/lib/rekap-constants';
import { type RekapViewMode } from '@/types/rekap';

interface RekapViewModeSelectProps {
    value: RekapViewMode;
    onValueChange: (value: RekapViewMode) => void;
    /** Class pada trigger; default `w-[210px]`. */
    triggerClassName?: string;
}

export function RekapViewModeSelect({ value, onValueChange, triggerClassName = 'w-[210px]' }: RekapViewModeSelectProps) {
    return (
        <Select value={value} onValueChange={(next) => onValueChange(next as RekapViewMode)}>
            <SelectTrigger className={triggerClassName} aria-label="Mode tampilan">
                <SelectValue placeholder="Pilih mode tampilan" />
            </SelectTrigger>
            <SelectContent>
                {REKAP_VIEW_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
