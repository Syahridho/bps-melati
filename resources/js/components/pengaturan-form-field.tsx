import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ReactNode } from 'react';

interface PengaturanFormFieldProps {
    id: string;
    label: ReactNode;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    hint?: string;
    required?: boolean;
    type?: 'text' | 'number';
    min?: number;
    max?: number;
}

/** Field formulir pengaturan: Label + Input + pesan error + catatan kecil. */
export function PengaturanFormField({
    id,
    label,
    value,
    onChange,
    error,
    placeholder,
    hint,
    required = false,
    type = 'text',
    min,
    max,
}: PengaturanFormFieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
                id={id}
                type={type}
                min={min}
                max={max}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
            />
            <InputError message={error} />
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}
