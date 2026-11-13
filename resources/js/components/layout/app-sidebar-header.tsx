import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import AppearanceToggleDropdown from './appearance-dropdown';
import { NotificationBell } from '@/components/notification-bell';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth, notifications_unread_count } = usePage<SharedData>().props;

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            <div className="flex w-full items-center justify-between gap-4">
                <div className="flex min-w-0 flex-row items-center gap-2">
                    <SidebarTrigger className="-ml-1 shrink-0" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <NotificationBell userId={auth.user.id} initialUnreadCount={notifications_unread_count ?? 0} />
                    <AppearanceToggleDropdown />
                </div>
            </div>
        </header>
    );
}
