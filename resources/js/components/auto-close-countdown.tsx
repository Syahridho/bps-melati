import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFullDate } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AutoCloseCountdownProps {
    autoCloseAt?: string | null;
    serverNow: string;
    ticketStatus: string;
}

export function AutoCloseCountdown({ autoCloseAt, serverNow, ticketStatus }: AutoCloseCountdownProps) {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        isExpired: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

    useEffect(() => {
        if (!autoCloseAt) return;
        const targetTime = new Date(autoCloseAt).getTime();
        // Hitung selisih waktu klien dan server saat load pertama
        const serverTime = new Date(serverNow).getTime();
        const clientTime = Date.now();
        const timeOffset = serverTime - clientTime;

        const calculate = () => {
            const now = Date.now() + timeOffset;
            const diff = targetTime - now;

            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }

            const seconds = Math.floor((diff / 1000) % 60);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [autoCloseAt, serverNow]);

    if (ticketStatus === 'selesai' || !autoCloseAt) {
        return null;
    }

    const formatString = () => {
        if (timeLeft.isExpired) {
            return 'Segera ditutup otomatis';
        }
        if (timeLeft.days > 0) {
            return `Selesai otomatis dalam ${timeLeft.days} hari ${timeLeft.hours} jam ${timeLeft.minutes} menit`;
        }
        return `Selesai otomatis dalam ${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;
    };

    const getColorClass = () => {
        if (timeLeft.days < 3) {
            return 'text-destructive dark:text-red-400 border-destructive/30 bg-destructive/10';
        }
        if (timeLeft.days <= 7) {
            return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
        }
        return 'text-muted-foreground border-border bg-muted/40';
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium', getColorClass())}>
                        <Clock className="size-3.5 shrink-0" />
                        <span>{formatString()}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Penutupan otomatis pada: {formatFullDate(autoCloseAt)}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
