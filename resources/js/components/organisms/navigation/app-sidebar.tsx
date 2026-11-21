import { NavMain } from '@/components/organisms/navigation/nav-main';
import { NavUser } from '@/components/organisms/navigation/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useAuthRole } from '@/hooks/use-auth-role';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEcho, useEchoPublic } from '@laravel/echo-react';
import { ClipboardCheck, ClipboardList, FilePlus2, Folder, Inbox, LayoutGrid, SettingsIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLogo from '@/components/atoms/app-logo';

export function AppSidebar() {
    const { inbox_open_count, my_reports_open_count } = usePage<SharedData>().props;
    const { user, isAdmin, isOperator, isOperatorTim, canAccessInbox } = useAuthRole();

    const [openCount, setOpenCount] = useState(inbox_open_count ?? 0);
    const reloadTimerRef = useRef<number | null>(null);

    // Sinkronkan state lokal dengan prop Inertia saat navigasi
    useEffect(() => {
        setOpenCount(inbox_open_count ?? 0);
    }, [inbox_open_count]);

    useEffect(() => {
        return () => {
            if (reloadTimerRef.current !== null) {
                window.clearTimeout(reloadTimerRef.current);
            }
        };
    }, []);

    const scheduleReload = useCallback(() => {
        if (reloadTimerRef.current !== null) {
            window.clearTimeout(reloadTimerRef.current);
        }

        reloadTimerRef.current = window.setTimeout(() => {
            // router.reload() sudah mempertahankan state & scroll secara default.
            router.reload({
                only: ['tickets', 'counts', 'inbox_open_count'],
            });
        }, 400);
    }, []);

    useEchoPublic('admin.notifications', '.ticket.created', (event: { ticket_number?: string }) => {
        if (canAccessInbox) {
            const ticketNum = event?.ticket_number ? ` #${event.ticket_number}` : '';

            toast(`Laporan Masuk Baru${ticketNum}`, {
                description: 'Ada laporan baru yang perlu ditindak lanjuti.',

                actionButtonStyle: {
                    background: '#ffffff',
                    color: '#005fb6',
                },
                position: 'bottom-right',
                className: '!bg-[#005fb6] !text-white !border-none !dark:bg-[#004a91] !dark:text-slate-100',
            });

            scheduleReload();
        }
    });

    useEcho(
        user && canAccessInbox ? 'inbox.incoming-reports' : '',
        '.inbox.updated',
        () => {
            scheduleReload();
        },
        [user?.id, canAccessInbox],
    );

    useEcho(
        user && canAccessInbox ? 'inbox.incoming-reports' : '',
        '.inbox.changed',
        () => {
            scheduleReload();
        },
        [user?.id, canAccessInbox],
    );

    const adminNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard/admin',
            icon: LayoutGrid,
        },
        {
            title: 'Kelola Operator',
            url: '/dashboard/admin/operator-management',
            icon: Users,
        },
        {
            title: 'Input Data',
            url: '/dashboard/admin/input-data',
            icon: FilePlus2,
        },
        {
            title: 'Laporan Masuk',
            url: '/dashboard/admin/incoming-reports',
            icon: Inbox,
            badge: openCount,
        },

        {
            title: 'Laporan Selesai',
            url: '/dashboard/admin/completed-reports',
            icon: ClipboardList,
        },

        {
            title: 'Rekap',
            url: '/dashboard/admin/monthly-recap',
            icon: Folder,
            items: [
                {
                    title: 'Rekap Bulanan',
                    url: '/dashboard/admin/monthly-recap',
                },
                {
                    title: 'Rekap Periodik',
                    url: '/dashboard/admin/periodic-recap',
                },
            ],
        },
        {
            title: 'Pengaturan',
            url: '/settings/application',
            icon: SettingsIcon,
        },
    ];

    const operatorNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard/operator',
            icon: LayoutGrid,
        },
        {
            title: 'Input Data',
            url: '/dashboard/operator/input-data',
            icon: FilePlus2,
        },
        {
            title: 'Laporan Masuk',
            url: '/dashboard/operator/incoming-reports',
            icon: Inbox,
            badge: openCount,
        },
        {
            title: 'Laporan Saya',
            url: '/dashboard/operator/my-reports',
            icon: ClipboardCheck,
            badge: my_reports_open_count ?? 0,
        },

        {
            title: 'Laporan Selesai',
            url: '/dashboard/operator/completed-reports',
            icon: ClipboardList,
        },

        {
            title: 'Rekap',
            url: '/dashboard/operator/monthly-recap',
            icon: Folder,
            items: [
                {
                    title: 'Rekap Bulanan',
                    url: '/dashboard/operator/monthly-recap',
                },
                {
                    title: 'Rekap Periodik',
                    url: '/dashboard/operator/periodic-recap',
                },
            ],
        },
    ];

    const operatorTimNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard/operator',
            icon: LayoutGrid,
        },
        {
            title: 'Input Data',
            url: '/dashboard/operator/input-data',
            icon: FilePlus2,
        },
    ];

    const mainNavItems = isAdmin ? adminNavItems : isOperatorTim ? operatorTimNavItems : isOperator ? operatorNavItems : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={'/'}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
