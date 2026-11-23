import AppLogo from '@/components/atoms/app-logo';
import { NavMain } from '@/components/organisms/navigation/nav-main';
import { NavUser } from '@/components/organisms/navigation/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useAuthRole } from '@/hooks/use-auth-role';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEcho, useEchoPublic } from '@laravel/echo-react';
import { ClipboardCheck, ClipboardList, FilePlus2, Folder, Inbox, LayoutGrid, ScrollText, SettingsIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function AppSidebar() {
    const { inbox_open_count, my_reports_open_count, audit_log_badge } = usePage<SharedData>().props;
    const { user, isAdmin, isOperator, isOperatorTim, canAccessInbox } = useAuthRole();

    const [openCount, setOpenCount] = useState(inbox_open_count ?? 0);
    const [myReportsCount, setMyReportsCount] = useState(my_reports_open_count ?? 0);
    const [auditLogBadge, setAuditLogBadge] = useState(audit_log_badge ?? 0);
    const reloadTimerRef = useRef<number | null>(null);

    // Sinkronkan state lokal dengan prop Inertia saat navigasi
    useEffect(() => {
        setOpenCount(inbox_open_count ?? 0);
    }, [inbox_open_count]);

    useEffect(() => {
        setMyReportsCount(my_reports_open_count ?? 0);
    }, [my_reports_open_count]);

    useEffect(() => {
        setAuditLogBadge(audit_log_badge ?? 0);
    }, [audit_log_badge]);

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
                only: ['tickets', 'counts', 'inbox_open_count', 'my_reports_open_count'],
            });
        }, 400);
    }, []);

    // Subscriptions dipasang lewat komponen anak agar hook Echo
    // tidak dipanggil dengan channel kosong (menghindari error console).
    // Komponen anak hanya di-mount saat kondisi terpenuhi.

    // Fallback polling ringan saat WebSocket terputus/tab aktif.
    useEffect(() => {
        if (!isOperator && !canAccessInbox) {
            return;
        }

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({
                    only: ['inbox_open_count', 'my_reports_open_count'],
                });
            }
        }, 45000);

        return () => window.clearInterval(intervalId);
    }, [isOperator, canAccessInbox]);

    const fetchAuditLogBadge = useCallback(async () => {
        if (!isAdmin) {
            return;
        }
        try {
            const response = await fetch(route('audit-log.flags-summary'), {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setAuditLogBadge((prev) => (typeof data.new_count === 'number' ? data.new_count : prev));
            }
        } catch {
            // Silent fail - pertahankan nilai terakhir
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }
        fetchAuditLogBadge();
        // Refresh badge setiap 30 detik (fallback polling)
        const intervalId = setInterval(fetchAuditLogBadge, 30000);
        return () => clearInterval(intervalId);
    }, [isAdmin, fetchAuditLogBadge]);

    // Realtime audit log dipasang lewat komponen anak (kondisional).

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
            url: '/settings/assignment',
            activePrefix: '/settings',
            icon: SettingsIcon,
        },
        {
            title: 'Audit Log',
            url: '/audit-log',
            icon: ScrollText,
            badge: auditLogBadge,
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
            icon: ClipboardList,
            badge: myReportsCount ?? 0,
        },

        {
            title: 'Laporan Selesai',
            url: '/dashboard/operator/completed-reports',
            icon: ClipboardCheck,
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
        <>
            {canAccessInbox && <InboxRealtimeSubscriber user={user} canAccessInbox={canAccessInbox} scheduleReload={scheduleReload} />}
            {isOperator && user && <OperatorReportsRealtimeSubscriber user={user} scheduleReload={scheduleReload} />}
            {isAdmin && <AuditLogRealtimeSubscriber fetchAuditLogBadge={fetchAuditLogBadge} />}
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
        </>
    );
}

function InboxRealtimeSubscriber({
    user,
    canAccessInbox,
    scheduleReload,
}: {
    user: { id?: number } | null;
    canAccessInbox: boolean;
    scheduleReload: () => void;
}) {
    useEchoPublic('admin.notifications', '.ticket.created', (event: { ticket_number?: string }) => {
        if (!canAccessInbox) {
            return;
        }
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
    });

    useEcho(
        'inbox.incoming-reports',
        '.inbox.updated',
        () => {
            scheduleReload();
        },
        [user?.id, scheduleReload],
    );

    useEcho(
        'inbox.incoming-reports',
        '.inbox.changed',
        () => {
            scheduleReload();
        },
        [user?.id, scheduleReload],
    );

    return null;
}

function OperatorReportsRealtimeSubscriber({ user, scheduleReload }: { user: { id?: number }; scheduleReload: () => void }) {
    useEcho(
        `laporan.operator.${user.id}`,
        '.laporan.changed',
        () => {
            scheduleReload();
        },
        [user?.id, scheduleReload],
    );

    return null;
}

function AuditLogRealtimeSubscriber({ fetchAuditLogBadge }: { fetchAuditLogBadge: () => void }) {
    useEcho(
        'audit.log',
        '.audit.log.created',
        () => {
            fetchAuditLogBadge();
        },
        [fetchAuditLogBadge],
    );

    return null;
}
