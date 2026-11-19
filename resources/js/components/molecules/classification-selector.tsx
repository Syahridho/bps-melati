import { cn } from '@/lib/utils';
import { CLASSIFICATIONS } from '@/lib/welcome-constants';
import { type ClassificationType } from '@/types/welcome';
import { CheckCircle2, Circle } from 'lucide-react';

interface ClassificationSelectorProps {
    value: ClassificationType | '';
    onChange: (v: ClassificationType) => void;
}

export function ClassificationSelector({ value, onChange }: ClassificationSelectorProps) {
    return (
        <div role="radiogroup" aria-labelledby="jenis-label" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {CLASSIFICATIONS.map((option) => {
                const selected = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'focus-visible:ring-ring/50 flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]',
                            selected ? 'border-primary bg-primary/5 text-primary ring-primary ring-1' : 'bg-card hover:bg-accent',
                        )}
                    >
                        {selected ? (
                            <CheckCircle2 className="text-primary size-4 shrink-0" />
                        ) : (
                            <Circle className="text-muted-foreground size-4 shrink-0" />
                        )}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
