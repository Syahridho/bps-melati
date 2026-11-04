import { UserInfo } from '@/components/layout/user-info';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { KeyRound, LogOut, Palette } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();

        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch {
            // abaikan: storage bisa tidak tersedia (mode privat, dll.)
        }

        if (typeof window !== 'undefined') {
            const win = window as unknown as { Echo?: { disconnect: () => void } };
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

            <DropdownMenuItem asChild>
                <Link className="block w-full" href={route('password.edit')} onClick={cleanup}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Kata Sandi
                </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
                <Link className="block w-full" href={route('appearance')} onClick={cleanup}>
                    <Palette className="mr-2 h-4 w-4" />
                    Tema
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
