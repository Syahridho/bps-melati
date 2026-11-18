import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useId } from 'react';

export interface SensorToggleButtonProps {
    showOriginal: boolean;
    onToggle: () => void;
    label?: string;
    description?: string;
    className?: string;
}

export default function SensorToggleButton({ showOriginal, onToggle, label, description, className }: SensorToggleButtonProps) {
    const id = useId();

    return (
        <div className={cn('bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:w-auto', className)}>
            <div className="flex min-w-0 flex-col text-left sm:text-right">
                <Label htmlFor={id} className="flex cursor-pointer items-center gap-1 text-xs font-medium sm:justify-end">
                    {showOriginal ? (
                        <EyeOff className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                        <Eye className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {label ?? 'Tampilkan Kata Asli'}
                </Label>
                <span className="text-muted-foreground text-[10px]">
                    {description ?? (showOriginal ? 'Kata kasar terlihat' : 'Kata kasar disensor')}
                </span>
            </div>

            <Switch id={id} checked={showOriginal} onCheckedChange={() => onToggle()} />
        </div>
    );
}

export { SensorToggleButton };
