import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RekapChatSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    triggerClassName?: string;
    disabled?: boolean;
}

export function RekapChatSelect({
    value,
    onValueChange,
    triggerClassName = 'w-36 bg-background',
    disabled = false,
}: RekapChatSelectProps) {
    const normalizedValue = value === '1' ? '1' : '0';

    return (
        <Select value={normalizedValue} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={triggerClassName} aria-label="Pilihan percakapan PDF">
                <SelectValue placeholder="Pilih opsi chat" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="0">Tanpa chat</SelectItem>
                <SelectItem value="1">Dengan chat</SelectItem>
            </SelectContent>
        </Select>
    );
}
