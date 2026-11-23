import { RATING_LABELS, RATING_VALUES } from '@/lib/rating';
import { Star } from 'lucide-react';
import { useState } from 'react';

export function StarRatingDisplay({ value, size = 'h-5 w-5' }: { value: number; size?: string }) {
    return (
        <div className="flex items-center gap-1" aria-label={`Rating ${value} dari 5`}>
            {RATING_VALUES.map((v) => (
                <Star key={v} className={v <= value ? `${size} fill-amber-400 text-amber-400` : `text-muted-foreground ${size}`} />
            ))}
        </div>
    );
}

interface StarRatingInputProps {
    value: number | null;
    onChange: (value: number | null) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
    const [hover, setHover] = useState<number | null>(null);
    const active = hover ?? value;
    const toggle = (v: number) => onChange(value === v ? null : v);

    return (
        <>
            <div role="radiogroup" aria-label="Rating 1 sampai 5" className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
                {RATING_VALUES.map((v) => (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={value === v}
                        aria-label={`${v} bintang${value === v ? ', terpilih' : ''}`}
                        className="focus-visible:ring-ring rounded-sm p-1 focus:outline-none focus-visible:ring-2"
                        onClick={() => toggle(v)}
                        onMouseEnter={() => setHover(v)}
                    >
                        <Star
                            className={active !== null && v <= active ? 'h-6 w-6 fill-amber-400 text-amber-400' : 'text-muted-foreground h-6 w-6'}
                        />
                    </button>
                ))}
            </div>
            <p className="text-muted-foreground h-4 text-xs">{active !== null ? RATING_LABELS[active] : '\u00A0'}</p>
        </>
    );
}
