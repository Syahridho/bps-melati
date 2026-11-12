import { UserInfo } from '@/components/layout/user-info';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { type User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const pageUrl = usePage().url;
    const currentPath = pageUrl.split('?')[0].split('#')[0];

    const isSettingsPage = currentPath.startsWith('/settings/');

    const settingsUrl = user.role === 'admin' ? route('settings.application.edit') : route('settings.notification');

    const handleLogout = () => {
        cleanup();

        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch {
            // abaikan: storage bisa tidak tersedia (mode privat, dll.)
        }

        if (typeof window !== 'undefined') {
            const win = window as unknown as { Echo?: { disconnect: () => void; leave: (channel: string) => void } };
            win.Echo?.leave('online-users');
            win.Echo?.disconnect();
        }

        router.post(
            route('logout'),
            {},
            {
                onFinish: () => {
                    window.location.href = '/login';
                },
            },
        );
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className={cn('w-full justify-start', { 'bg-muted font-medium': isSettingsPage })}>
                <Link className="block w-full" href={settingsUrl} onClick={cleanup}>
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
                className="cursor-pointer"
                onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                }}
            >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
        </>
    );
}
