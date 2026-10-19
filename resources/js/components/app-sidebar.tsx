import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEcho, useEchoPublic } from '@laravel/echo-react';
import { ClipboardList, FilePlus2, Folder, Inbox, LayoutGrid, Settings, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth, inbox_open_count } = usePage<SharedData>().props;

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

    // Dengarkan event real-time tiket baru di posisi mana saja
    useEchoPublic('admin.notifications', '.ticket.created', (event: { ticket_number?: string }) => {
        if (auth.user.role === 'admin' || auth.user.role === 'operator') {
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

    // Dengarkan pembaruan inbox (tiket selesai/dibalas/auto close) untuk sinkronisasi badge
    useEcho(
        auth?.user && auth.user.role !== 'operator_tim' ? 'inbox.laporan-masuk' : '',
        '.inbox.updated',
        () => {
            scheduleReload();
        },
        [auth?.user],
    );

    useEcho(
        auth?.user && auth.user.role !== 'operator_tim' ? 'inbox.laporan-masuk' : '',
        '.inbox.changed',
        () => {
            scheduleReload();
        },
        [auth?.user],
    );

    const adminNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard/admin',
            icon: LayoutGrid,
        },
        {
            title: 'Kelola Operator',
            url: '/dashboard/admin/operator',
            icon: Users,
        },
        {
            title: 'Input Data',
            url: '/dashboard/admin/input-data',
            icon: FilePlus2,
        },
        {
            title: 'Laporan Masuk',
            url: '/dashboard/admin/laporan-masuk',
            icon: Inbox,
            badge: openCount,
        },

        {
            title: 'Laporan Selesai',
            url: '/dashboard/admin/laporan-selesai',
            icon: ClipboardList,
        },

        {
            title: 'Rekap',
            url: '/dashboard/admin/rekap-bulanan',
            icon: Folder,
            items: [
                {
                    title: 'Rekap Bulanan',
                    url: '/dashboard/admin/rekap-bulanan',
                },
                {
                    title: 'Rekap Periodik',
                    url: '/dashboard/admin/rekap-periodik',
                },
            ],
        },
        {
            title: 'Pengaturan',
            url: '/settings/application',
            icon: Settings,
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
            url: '/dashboard/operator/laporan-masuk',
            icon: Inbox,
            badge: openCount,
        },

        {
            title: 'Laporan Selesai',
            url: '/dashboard/operator/laporan-selesai',
            icon: ClipboardList,
        },

        {
            title: 'Rekap',
            url: '/dashboard/operator/rekap-bulanan',
            icon: Folder,
            items: [
                {
                    title: 'Rekap Bulanan',
                    url: '/dashboard/operator/rekap-bulanan',
                },
                {
                    title: 'Rekap Periodik',
                    url: '/dashboard/operator/rekap-periodik',
                },
            ],
        },
    ];

    const operatorTimNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard/operator-tim',
            icon: LayoutGrid,
        },
        {
            title: 'Input Data',
            url: '/dashboard/operator-tim/input-data',
            icon: FilePlus2,
        },
    ];

    const mainNavItems = auth.user.role === 'admin' 
        ? adminNavItems 
        : (auth.user.role === 'operator_tim' ? operatorTimNavItems : operatorNavItems);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={'/'} prefetch>
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
