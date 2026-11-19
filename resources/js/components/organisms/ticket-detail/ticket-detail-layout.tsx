import AdminPage from '@/layouts/dashboard/page';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';

export interface TicketDetailLayoutProps {
    ticketNumber: string;
    backHref: string;
    backLabel: string;
    successMessage?: string | null;
    headerActions?: ReactNode;
    children: ReactNode;
    dialogs?: ReactNode;
}

export function TicketDetailLayout({
    ticketNumber,
    backHref,
    backLabel,
    successMessage,
    headerActions,
    children,
    dialogs,
}: TicketDetailLayoutProps) {
    return (
        <AdminPage
            breadcrumbs={[
                { title: backLabel, href: backHref },
                { title: ticketNumber, href: '#' },
            ]}
        >
            <Head title={ticketNumber} />
            <div className="space-y-6">
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Link
                        href={backHref}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                    {headerActions}
                </div>

                {children}
            </div>

            {dialogs}
        </AdminPage>
    );
}
