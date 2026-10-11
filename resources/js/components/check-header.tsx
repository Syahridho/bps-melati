import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

export function CheckHeader() {
    return (
        <header className="border-b">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <Link href={route('home')} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium">
                        <ArrowLeft className="h-4 w-4" />
                        Beranda
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <h1 className="text-base font-semibold">Cek Status Tiket</h1>
                </div>
                <nav className="flex items-center gap-4">
                    <AppearanceToggleDropdown />
                </nav>
            </div>
        </header>
    );
}
