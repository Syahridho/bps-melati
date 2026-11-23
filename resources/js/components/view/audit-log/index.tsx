import { FlagsTab } from '@/components/organisms/audit-log/flags-tab.js';
import { LogsTab } from '@/components/organisms/audit-log/logs-tab.js';
import { SummaryTab } from '@/components/organisms/audit-log/summary-tab.js';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { useAuditFlags } from '@/hooks/audit-log/use-audit-flags';
import { useAuditLogs } from '@/hooks/audit-log/use-audit-logs.js';
import { useAuditSummary } from '@/hooks/audit-log/use-audit-summary';
import { useFlagReview } from '@/hooks/audit-log/use-flag-review';
import { useAuthRole } from '@/hooks/use-auth-role';
import AdminPage from '@/layouts/dashboard/page';
import { FLAG_TYPE_LABELS } from '@/lib/audit-log';
import { TabKey } from '@/types/audit-log.js';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { ReviewFlagDialog } from './review-flag-dialog/index.js';

export default function AuditLogView() {
    const { isAdmin } = useAuthRole();
    const [activeTab, setActiveTab] = useState<TabKey>('logs');

    const logs = useAuditLogs(isAdmin, activeTab === 'logs');
    const flags = useAuditFlags(isAdmin, activeTab === 'flags');
    const summary = useAuditSummary(isAdmin, activeTab === 'summary');

    const review = useFlagReview(() => {
        flags.refresh(true);
        summary.refresh(true);
    });

    if (!isAdmin) return null;

    return (
        <AdminPage breadcrumbs={[{ title: 'Audit Log', href: route('audit-log.index') }]}>
            <Head title="Audit Log" />

            <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
                <p className="text-muted-foreground text-sm">Kelola data mencurigakan</p>
            </div>

            <div className="space-y-4">
                <div className="border-border flex border-b px-4 pb-2">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                        <TabsList>
                            <TabsTrigger value="logs">Log Langsung</TabsTrigger>
                            <TabsTrigger value="flags">Penanda</TabsTrigger>
                            <TabsTrigger value="summary">Ringkasan</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {activeTab === 'logs' && <LogsTab {...logs} />}
                {activeTab === 'flags' && <FlagsTab {...flags} onReview={review.openReview} />}
                {activeTab === 'summary' && <SummaryTab {...summary} />}
            </div>

            <ReviewFlagDialog
                open={review.open}
                onOpenChange={review.setOpen}
                group={review.group}
                flagTypeLabels={FLAG_TYPE_LABELS}
                status={review.status}
                onStatusChange={review.setStatus}
                note={review.note}
                onNoteChange={review.setNote}
                error={review.error}
                saving={review.saving}
                onSubmit={review.submit}
            />
        </AdminPage>
    );
}
