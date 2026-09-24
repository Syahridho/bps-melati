import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, FilePlus2, Folder, Inbox, LayoutGrid } from 'lucide-react';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        url: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        url: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard/admin',
        icon: LayoutGrid,
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
];

const operatorNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard/operator',
        icon: LayoutGrid,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const url = auth.user.role === 'admin' ? '/dashboard/admin' : '/dashboard/operator';
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
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
