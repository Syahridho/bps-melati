import { Separator } from '@/components/ui/separator';
import SensorToggleButton from './sensor-toggle-button';

export interface TicketContentCardProps {
    title?: string | null;
    content?: string | null;
    hasProfanity?: boolean;
    titleOriginal?: string | null;
    contentOriginal?: string | null;
    showOriginal?: boolean;
    onToggle?: () => void;
}

export function TicketContentCard({
    title,
    content,
    hasProfanity,
    titleOriginal,
    contentOriginal,
    showOriginal = false,
    onToggle,
}: TicketContentCardProps) {
    const hasTitle = Boolean(title && title.trim());
    const hasContent = Boolean(content && content.trim());

    if (!hasTitle && !hasContent) {
        return null;
    }

    const canShowOriginal = Boolean(hasProfanity && (titleOriginal != null || contentOriginal != null));

    const displayTitle = showOriginal && titleOriginal ? titleOriginal : title;
    const displayContent = showOriginal && contentOriginal ? contentOriginal : content;

    return (
        <>
            <Separator />
            <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
                {hasProfanity && (
                    <span className="border-destructive/20 bg-destructive/5 text-destructive rounded-full border px-2 py-0.5 text-xs font-medium">
                        Mengandung kata kasar
                    </span>
                )}
                {hasTitle && (
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold [overflow-wrap:anywhere] break-words sm:text-xl">{displayTitle}</h3>
                    </div>
                )}
                {hasContent && (
                    <div>
                        <div className="bg-muted/20 rounded-lg border p-4 text-sm">
                            <p className="min-w-0 leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap">{displayContent}</p>
                        </div>
                    </div>
                )}
                {canShowOriginal && !hasTitle && onToggle && <SensorToggleButton showOriginal={showOriginal} onToggle={onToggle} />}
            </div>
        </>
    );
}
