import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface InfoFieldItem {
    id: string;
    label: string;
    value: ReactNode;
    icon: LucideIcon;
    className?: string;
}

export interface TicketInfoGridProps {
    fields: (InfoFieldItem | null | undefined | false)[];
}

export function TicketInfoGrid({ fields }: TicketInfoGridProps) {
    const validFields = fields.filter(Boolean) as InfoFieldItem[];

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-5 px-4 py-4 sm:px-6 sm:py-5">
            {validFields.map((field) => (
                <div key={field.id} className={`min-w-0 ${field.className ?? ''}`}>
                    <p className="text-muted-foreground text-xs">{field.label}</p>
                    <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{field.value}</p>
                </div>
            ))}
        </div>
    );
}
