import { Label } from '@/components/ui/label';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormFieldProps {
    id: string;
    label: string;
    icon: LucideIcon;
    error?: string;
    children: ReactNode;
}

export function FormField({ id, label, icon: Icon, error, children }: FormFieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" aria-hidden="true" />
                {children}
            </div>
            {error && (
                <p id={`${id}-error`} className="text-destructive text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}
