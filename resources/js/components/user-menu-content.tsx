import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link } from '@inertiajs/react';
import { KeyRound, LogOut, Palette } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
                <Link href="/settings/password" className="block w-full cursor-pointer" onClick={cleanup}>
                    <KeyRound className="mr-2 size-4" />
                    Ubah Kata Sandi
                </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
                <Link href="/settings/appearance" className="block w-full cursor-pointer" onClick={cleanup}>
                    <Palette className="mr-2 size-4" />
                    Tema
                </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2 size-4" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
