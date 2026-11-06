import { Separator } from '@/components/ui/separator';

export interface TicketContentCardProps {
    title?: string | null;
    content?: string | null;
}

export function TicketContentCard({ title, content }: TicketContentCardProps) {
    const hasTitle = Boolean(title && title.trim());
    const hasContent = Boolean(content && content.trim());

    if (!hasTitle && !hasContent) {
        return null;
    }

    return (
        <>
            <Separator />
            <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
                {hasTitle && (
                    <div>
                        <h3 className="text-lg font-semibold [overflow-wrap:anywhere] break-words sm:text-xl">{title}</h3>
                    </div>
                )}
                {hasContent && (
                    <div>
                        <div className="bg-muted/20 rounded-lg border p-4 text-sm">
                            <p className="min-w-0 leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                                {content}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
