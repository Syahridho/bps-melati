import { Badge } from '@/components/ui/badge';
import {
    classificationLabel,
    classificationVariant,
    formatFullDate,
    statusLabel,
    statusVariant,
} from '@/lib/laporan-masuk-utils';
import { Clock, ShieldAlert, TimerOff } from 'lucide-react';
import { ReactNode } from 'react';
import { TicketClassification, TicketStatus } from './types';

export interface TicketDetailHeaderProps {
    ticketNumber: string;
    classification: TicketClassification;
    status: TicketStatus;
    createdAt: string;
    autoCloseAt?: string | null;
    isPengawasan?: boolean;
    pengawasanAt?: string | null;
    pengawasanByName?: string | null;
    kadarPengawasanDays?: number;
    badges?: ReactNode;
    actions?: ReactNode;
}

export function TicketDetailHeader({
    ticketNumber,
    classification,
    status,
    createdAt,
    autoCloseAt,
    isPengawasan,
    pengawasanAt,
    pengawasanByName,
    kadarPengawasanDays,
    badges,
    actions,
}: TicketDetailHeaderProps) {
    return (
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 text-xl font-bold [overflow-wrap:anywhere] break-words">{ticketNumber}</h2>
                    <Badge variant={classificationVariant(classification)}>{classificationLabel(classification)}</Badge>
                    <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                    {isPengawasan && (
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Pengawasan
                        </Badge>
                    )}
                    {badges}
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Diterima {formatFullDate(createdAt)}</span>
                </div>
                {autoCloseAt && (
                    <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                        <TimerOff className="mt-0.5 size-3.5 shrink-0" />
                        <span>Akan ditutup otomatis pada {formatFullDate(autoCloseAt)} bila pelapor tidak membalas.</span>
                    </div>
                )}
                {isPengawasan && pengawasanAt && (
                    <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        <span>
                            Aktif sejak {formatFullDate(pengawasanAt)} oleh {pengawasanByName ?? 'Petugas'} - auto close{' '}
                            {kadarPengawasanDays} hari
                        </span>
                    </div>
                )}
            </div>

            {actions && (
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
                    {actions}
                </div>
            )}
        </div>
    );
}
