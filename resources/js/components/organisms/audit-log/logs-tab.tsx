import { format } from 'date-fns';

import { LogsSkeleton } from '@/components/molecules/audit-log-skeletons';
import { ErrorBox } from '@/components/molecules/error-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { useAuditLogs } from '@/hooks/audit-log/use-audit-logs';
import { severityVariant } from '@/lib/audit-log';

type LogsTabProps = ReturnType<typeof useAuditLogs>;

export function LogsTab({ logs, loading, error, newCount, category, setCategory, severity, setSeverity, refresh }: LogsTabProps) {
    if (loading) return <LogsSkeleton />;
    if (error) return <ErrorBox message={error} />;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <select
                    className="border-border focus:ring-primary flex-1 rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">Semua Kategori</option>
                    <option value="ticket">Ticket</option>
                    <option value="auth">Autentikasi</option>
                    <option value="setting">Pengaturan</option>
                    <option value="user">Pengguna</option>
                    <option value="export">Ekspor</option>
                </select>
                <select
                    className="border-border focus:ring-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                >
                    <option value="">Semua Severity</option>
                    <option value="info">Info</option>
                    <option value="notice">Notice</option>
                    <option value="warning">Warning</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
                    Refresh
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-20">Waktu</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Ticket</TableHead>
                        <TableHead>IP</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{format(new Date(log.created_at), 'dd MMM HH:mm')}</TableCell>
                            <TableCell>{log.category}</TableCell>
                            <TableCell>{log.event_type}</TableCell>
                            <TableCell>
                                <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
                            </TableCell>
                            <TableCell>{log.actor_name || 'N/A'}</TableCell>
                            <TableCell>{log.ticket_number || '-'}</TableCell>
                            <TableCell>{log.ip || 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                    {logs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                                Tidak ada log audit
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {logs.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Menampilkan {logs.length} log audit terakhir</span>
                    <span className="text-muted-foreground text-xs">Real-time: {newCount > 0 ? `${newCount} baru` : 'Up to date'}</span>
                </div>
            )}
        </div>
    );
}
