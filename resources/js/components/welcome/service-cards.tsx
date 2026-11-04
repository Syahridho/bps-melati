import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, MessagesSquare, Users, type LucideIcon } from 'lucide-react';

export interface ServiceCardItem {
    icon: LucideIcon;
    titleLine1: string;
    titleLine2: string;
    description: string;
    linkText: string;
    href: string;
    external?: boolean;
}

export const SERVICE_CARDS: ServiceCardItem[] = [
    {
        icon: Users,
        titleLine1: 'Wistleblowing System',
        titleLine2: '',
        description: 'Menerima laporan pelanggaran (pengaduan) kecurangan dalam pengelolaan keuangan Negara.',
        linkText: 'Pengaduan BPS',
        href: 'https://webapps.bps.go.id/pengaduan/wbs/beranda',
        external: true,
    },
    {
        icon: MessagesSquare,
        titleLine1: 'Layanan Lapor.go.id',
        titleLine2: '',
        description: 'Layanan pengaduan, aspirasi, permintaan informasi yang dikelola oleh Kantor Staf Presiden.',
        linkText: 'Lapor.go.id',
        href: 'https://lapor.go.id',
        external: true,
    },
];

interface ServiceCardProps {
    icon: LucideIcon;
    titleLine1: string;
    titleLine2?: string;
    description: string;
    linkText: string;
    href: string;
    external?: boolean;
}

export function ServiceCard({ icon: Icon, titleLine1, titleLine2, description, linkText, href, external }: ServiceCardProps) {
    return (
        <Card className="bg-card text-card-foreground flex h-full flex-col rounded-xl border shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="space-y-4 p-6 pb-2">
                <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12">
                    <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold tracking-tight">
                        {titleLine1}
                        {titleLine2 && <span className="block">{titleLine2}</span>}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-6 pt-0">
                <CardDescription className="text-muted-foreground text-sm leading-relaxed">{description}</CardDescription>
            </CardContent>
            <CardFooter className="mt-auto p-6 pt-0">
                <Button variant="link" asChild className="group text-primary h-auto p-0 font-medium hover:underline">
                    <a
                        href={href}
                        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="inline-flex items-center gap-1.5"
                    >
                        <span>{linkText}</span>
                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
