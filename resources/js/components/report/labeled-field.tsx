import { FieldError } from '@/components/report/field-error';
import { InfoHint } from '@/components/report/info-hint';
import { Label } from '@/components/ui/label';
import type { ReactNode } from 'react';

interface LabeledFieldProps {
    id: string;
    label: string;
    hint?: ReactNode;
    error?: string;
    description?: ReactNode;
    children: ReactNode;
}

export function LabeledField({ id, label, hint, error, description, children }: LabeledFieldProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                <Label htmlFor={id}>{label}</Label>
                {hint && <InfoHint side="right">{hint}</InfoHint>}
            </div>
            {children}
            {description}
            <FieldError message={error} />
        </div>
    );
}
