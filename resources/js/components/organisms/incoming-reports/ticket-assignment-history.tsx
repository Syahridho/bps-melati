import { formatFullDate } from '@/lib/incoming-reports-utils';
import { type AssignmentLogItem } from '@/types/incoming-reports';
import { History, UserRoundCog } from 'lucide-react';

interface TicketAssignmentHistoryProps {
    logs: AssignmentLogItem[];
}

export function TicketAssignmentHistory({ logs }: TicketAssignmentHistoryProps) {
    return (
        <div className="bg-card space-y-4 rounded-lg border p-4 sm:p-6">
            <h3 className="flex items-center gap-2 font-semibold">
                <History className="size-4" />
                Riwayat Penugasan
            </h3>

            {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada riwayat penugasan untuk tiket ini.</p>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 text-sm">
                            <UserRoundCog className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-medium">{log.action_label}</p>
                                <p className="text-muted-foreground text-xs">
                                    {log.from_user_name || log.to_user_name
                                        ? `${log.from_user_name ?? 'Tanpa PIC'} → ${log.to_user_name ?? 'Tanpa PIC'}`
                                        : 'Tidak ada perubahan PIC'}
                                    {log.performed_by_name ? ` · oleh ${log.performed_by_name}` : ''}
                                    {log.created_at ? ` · ${formatFullDate(log.created_at)}` : ''}
                                </p>
                                {log.note && <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">{log.note}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
