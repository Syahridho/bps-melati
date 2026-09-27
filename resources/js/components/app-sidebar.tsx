import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { ClipboardList, FilePlus2, Folder, Inbox, LayoutGrid, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AppLogo from './app-logo';

const operatorNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard/operator',
        icon: LayoutGrid,
    },
];

export function AppSidebar() {
    const { auth, unread_count } = usePage<SharedData>().props;
    const url = auth.user.role === 'admin' ? '/dashboard/admin' : '/dashboard/operator';

    const [unreadCount, setUnreadCount] = useState(unread_count ?? 0);

    // Sinkronkan state lokal dengan prop Inertia saat navigasi
    useEffect(() => {
        setUnreadCount(unread_count ?? 0);
    }, [unread_count]);

    // Dengarkan event real-time tiket baru di posisi mana saja
    useEchoPublic('admin.notifications', '.ticket.created', (event: { ticket_number?: string }) => {
        setUnreadCount((prev) => prev + 1);

        if (auth.user.role === 'admin') {
            const ticketNum = event?.ticket_number ? ` #${event.ticket_number}` : '';
            toast.info(`Laporan Masuk Baru${ticketNum}`, {
                description: 'Ada laporan baru yang perlu ditindaklanjuti.',
                action: {
                    label: 'Lihat',
                    onClick: () => router.visit(route('dashboard.admin.laporan-masuk.index')),
                },
            });

            if (window.location.pathname.startsWith('/dashboard/admin/laporan-masuk')) {
                router.reload({ preserveScroll: true });
            }
        }
    });

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
            badge: unreadCount,
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
                    title: 'Rekap Semesteran',
                    url: '/dashboard/admin/rekap-semesteran',
                },
                {
                    title: 'Rekap Tahunan',
                    url: '/dashboard/admin/rekap-tahunan',
                },
            ],
        },
        {
            title: 'Pengaturan',
            url: '/dashboard/admin/pengaturan',
            icon: Settings,
        },
       
    ];

    const mainNavItems = auth.user.role === 'admin' ? adminNavItems : operatorNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={url} prefetch>
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
