import { AppContent } from '@/components/layout/app-content';
import { AppShell } from '@/components/layout/app-shell';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppSidebarHeader } from '@/components/layout/app-sidebar-header';
import { Toaster } from '@/components/ui/toaster';
import { useReporterReplyToast } from '@/hooks/use-reporter-reply-toast';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    const { auth } = usePage<SharedData>().props;

    // Dipasang sekali di layout agar toast "Balasan baru dari pelapor" muncul
    // di seluruh halaman dashboard tanpa perlu listener per halaman.
    useReporterReplyToast(auth?.user?.id ?? null);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            <Toaster position="bottom-right" closeButton richColors />
        </AppShell>
    );
}
