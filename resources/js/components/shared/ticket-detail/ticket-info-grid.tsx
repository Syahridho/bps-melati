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
        <div className="grid gap-x-4 gap-y-5 px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5 xl:grid-cols-4">
            {validFields.map((field) => {
                const Icon = field.icon;
                return (
                    <div key={field.id} className={`flex min-w-0 items-start gap-3 ${field.className ?? ''}`}>
                        <div className="bg-muted shrink-0 rounded-md p-2">
                            <Icon className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{field.label}</p>
                            <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">{field.value}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
