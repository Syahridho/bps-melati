import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RekapStatusSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    triggerClassName?: string;
    disabled?: boolean;
}

export function RekapStatusSelect({
    value,
    onValueChange,
    triggerClassName = 'w-32 bg-background',
    disabled = false,
}: RekapStatusSelectProps) {
    const normalizedValue = value === 'proses' || value === 'selesai' ? value : 'all';

    return (
        <Select value={normalizedValue} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={triggerClassName} aria-label="Status laporan">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="proses">Proses</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
        </Select>
    );
}