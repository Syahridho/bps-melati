import { UserInfo } from '@/components/layout/user-info';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { type User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import { useRef } from 'react';

interface UserMenuContentProps {
    user: User;
}

async function cleanupPush(signal?: AbortSignal): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const registration = await navigator.serviceWorker.ready;

    const notifications = await registration.getNotifications();
    notifications.forEach((n) => n.close());

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
                await fetch(route('push.unsubscribe'), {
                    method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-CSRF-TOKEN':
                    document.querySelector<HTMLMetaElement>(
                        'meta[name="csrf-token"]',
                    )?.content ?? '',
            },
            credentials: 'same-origin',
            signal,
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
    }
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const isLoggingOut = useRef(false);
    const pageUrl = usePage().url;
    const currentPath = pageUrl.split('?')[0].split('#')[0];

    const isSettingsPage = currentPath.startsWith('/settings/');

    const settingsUrl = user.role === 'admin' ? route('settings.application.edit') : route('settings.notification');

    const handleLogout = async (e: Event) => {
        e.preventDefault();
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;

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

        // Hapus subscription push dari browser dan server sebelum logout.
        // Tidak memblokir logout jika gagal (jaringan, SW tidak siap, dll.).
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        let pushTimeoutId: ReturnType<typeof setTimeout> | undefined;
        const pushTimeout = new Promise<void>((resolve) => {
            pushTimeoutId = setTimeout(() => resolve(), 3000);
        });

        try {
            await Promise.race([
                cleanupPush(controller.signal),
                pushTimeout,
            ]);
        } catch (err) {
            console.warn('Cleanup push gagal, logout tetap dilanjutkan.', err);
        } finally {
            clearTimeout(timeoutId);
            clearTimeout(pushTimeoutId);

            router.post(
                route('logout'),
                {},
                {
                    onFinish: () => {
                        window.location.href = '/login';
                    },
                    onError: () => {
                        isLoggingOut.current = false;
                    },
                },
            );
        }
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
                    handleLogout(e);
                }}
            >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
        </>
    );
}
