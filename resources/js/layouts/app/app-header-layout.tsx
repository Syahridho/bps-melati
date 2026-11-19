import { AppContent } from '@/components/templates/layout/app-content';
import { AppHeader } from '@/components/organisms/navigation/app-header';
import { AppShell } from '@/components/templates/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { type BreadcrumbItem } from '@/types';

interface AppHeaderLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AppHeaderLayout({ children, breadcrumbs }: AppHeaderLayoutProps) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>{children}</AppContent>
            <Toaster position="bottom-right" closeButton richColors />
        </AppShell>
    );
}
