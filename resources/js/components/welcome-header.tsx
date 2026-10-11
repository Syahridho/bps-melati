import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { type User } from '@/types';
import { Link } from '@inertiajs/react';

interface WelcomeHeaderProps {
    user: User | null;
}

export function WelcomeHeader({ user }: WelcomeHeaderProps) {
    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
                <img src="/logo-melati.webp" alt="Logo BPS Melati" className="size-9 shrink-0 object-contain sm:size-10" />
                <img src="/desc-melati.webp" alt="Logo BPS" className="h-[26px] w-[74px] shrink-0 object-contain sm:h-[30px] sm:w-[84px]" />

                <nav className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('tickets.check')}>
                            <span className="sm:hidden">Cek Tiket</span>
                            <span className="hidden sm:inline">Cek Status Tiket</span>
                        </Link>
                    </Button>

                    {user && (
                        <Button asChild size="sm">
                            <Link href={user.role === 'admin' ? route('dashboard.admin.index') : route('dashboard.operator.index')}>Dashboard</Link>
                        </Button>
                    )}
                    <AppearanceToggleDropdown />
                </nav>
            </div>
        </header>
    );
}
