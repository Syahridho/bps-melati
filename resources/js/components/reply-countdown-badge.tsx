import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFullDate, classificationLabel } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type Classification } from '@/types/laporan-masuk';
import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

const CLASSIFICATION_DAYS: Record<Classification, number> = {
    pengaduan: 3,
    aspirasi: 1,
    permintaan_informasi: 5,
};

interface ReplyCountdownBadgeProps {
    deadline: string;
    classification: Classification;
    serverNow: string;
}

export function ReplyCountdownBadge({ deadline, classification, serverNow }: ReplyCountdownBadgeProps) {
    const [now, setNow] = useState<number>(() => {
        return Date.now();
    });

    const [offset] = useState<number>(() => {
        return new Date(serverNow).getTime() - Date.now();
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now() + offset);
        }, 1000);
        return () => clearInterval(timer);
    }, [offset]);

    const deadlineTime = new Date(deadline).getTime();
    const totalSeconds = Math.max(0, Math.floor((deadlineTime - now) / 1000));

    const days = CLASSIFICATION_DAYS[classification] ?? 3;
    const totalWindowSeconds = days * 24 * 3600;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const isExpired = totalSeconds <= 0;
    const isWaspada = !isExpired && totalSeconds <= 0.33 * totalWindowSeconds;

    const deadlineDateStr = formatFullDate(deadline);
    const classificationName = classificationLabel(classification);

    const tooltipText = isExpired
        ? `Batas membalas terlewat sejak ${deadlineDateStr} WIB`
        : `Batas membalas: ${deadlineDateStr} WIB\n${classificationName}: batas balas ${days} hari`;

    const ariaLabel = isExpired
        ? 'Batas waktu membalas telah habis'
        : `Sisa waktu membalas ${hours} jam ${minutes} menit ${seconds} detik`;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant={isExpired ? 'destructive' : isWaspada ? 'outline' : 'secondary'}
                        role="timer"
                        aria-live="off"
                        aria-label={ariaLabel}
                        className={cn(
                            'gap-1 tabular-nums font-mono text-[10px] px-1.5 py-0.5 shrink-0',
                            isWaspada && 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10',
                            isExpired && 'animate-pulse motion-reduce:animate-none',
                        )}
                    >
                        <Timer className="size-3 shrink-0" />
                        <span>{formattedTime}</span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-pre-line text-xs">
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
