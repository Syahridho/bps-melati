import { SummarySkeleton } from '@/components/molecules/audit-log-skeletons';
import { ErrorBox } from '@/components/molecules/error-box';
import type { useAuditSummary } from '@/hooks/audit-log/use-audit-summary';

type SummaryTabProps = ReturnType<typeof useAuditSummary>;

const CARDS = [
    { key: 'logs_this_week', label: 'Log Audit Mingguan' },
    { key: 'new_flags_this_week', label: 'Penanda Baru' },
    { key: 'reviewed_count', label: 'Flag Sudah Ditinjau' },
];

export function SummaryTab({ summary, loading, error }: SummaryTabProps) {
    if (loading) return <SummarySkeleton />;
    if (error) return <ErrorBox message={error} />;
    if (!summary) return <p className="text-muted-foreground">Tidak ada data ringkasan.</p>;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map(({ key, label }) => (
                <div key={key} className="border-border/30 bg-card rounded-md border p-4">
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <p className="text-2xl font-medium">{summary[key] ?? 0}</p>
                </div>
            ))}
        </div>
    );
}
