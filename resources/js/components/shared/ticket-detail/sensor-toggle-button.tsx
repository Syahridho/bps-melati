import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export interface SensorToggleButtonProps {
    showOriginal: boolean;
    onToggle: () => void;
    label?: string;
}

export default function SensorToggleButton({ showOriginal, onToggle, label }: SensorToggleButtonProps) {
    return (
        <Button
            size="sm"
            variant="outline"
            onClick={onToggle}
            type="button"
            aria-pressed={showOriginal}
            aria-label={label ?? (showOriginal ? 'Sembunyikan Asli' : 'Tampilkan Asli')}
            className="text-xs shrink-0"
        >
            {showOriginal ? (
                <>
                    <EyeOff className="mr-1 size-3.5" /> Sembunyikan Asli
                </>
            ) : (
                <>
                    <Eye className="mr-1 size-3.5" /> Tampilkan Asli
                </>
            )}
        </Button>
    );
}

export { SensorToggleButton };
