import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface FloatingServiceItem {
    name: string;
    href: string;
    logo: string;
    alt: string;
}

export const FLOATING_SERVICES: FloatingServiceItem[] = [
    {
        name: 'Wistleblowing System BPS',
        href: 'https://webapps.bps.go.id/pengaduan/wbs/beranda',
        logo: '/logo-ppid.png',
        alt: 'Logo PPID BPS',
    },
    {
        name: 'Lapor.go.id',
        href: 'https://lapor.go.id/',
        logo: '/logo-lapor.png',
        alt: 'Logo Lapor.go.id',
    },
];

export function FloatingServiceLinks() {
    return (
        <TooltipProvider delayDuration={200}>
            <nav
                aria-label="Layanan pengaduan cepat"
                className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)] md:right-6 md:bottom-6"
            >
                {FLOATING_SERVICES.map((service) => (
                    <Tooltip key={service.name}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="border-border bg-background dark:bg-muted size-12 rounded-full bg-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 md:size-14"
                            >
                                <a
                                    href={service.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={service.name}
                                    className="flex items-center justify-center p-2"
                                >
                                    <img
                                        src={service.logo}
                                        alt={service.alt}
                                        width={56}
                                        height={56}
                                        loading="lazy"
                                        className="size-full rounded-full object-contain"
                                    />
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={8}>
                            <p className="font-medium">{service.name}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </nav>
        </TooltipProvider>
    );
}
