import { Card, CardContent } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';
import { cn } from '@/lib/utils';
import { AlertCircle, HelpCircle, Lightbulb, Mail, Megaphone, Share2, ShieldAlert, Users, Globe } from 'lucide-react';

export interface PublicStats {
    total: number;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
    span_lapor: number;
    sosial_media: number;
    kunjungan_langsung: number;
    wbs: number;
    email: number;
    website: number;
}

type StatItem = {
    key: keyof PublicStats;
    label: string;
    icon: React.ElementType;
    card: string;
    iconWrap: string;
    text: string;
};

const classificationItems: StatItem[] = [
    {
        key: 'pengaduan',
        label: 'Pengaduan',
        icon: AlertCircle,
        card: '',
        iconWrap: '',
        text: 'text-rose-500 dark:text-rose-400',
    },
    {
        key: 'aspirasi',
        label: 'Aspirasi',
        icon: Lightbulb,
        card: '',
        iconWrap: '',
        text: 'text-blue-500 dark:text-blue-400',
    },
    {
        key: 'permintaan_informasi',
        label: 'Permintaan Informasi',
        icon: HelpCircle,
        card: '',
        iconWrap: '',
        text: 'text-violet-500 dark:text-violet-400',
    },
];

const channelItems: StatItem[] = [
    {
        key: 'span_lapor',
        label: 'SP4N-LAPOR!',
        icon: Megaphone,
        card: '',
        iconWrap: '',
        text: 'text-rose-500 dark:text-rose-400',
    },
    {
        key: 'sosial_media',
        label: 'Sosial Media',
        icon: Share2,
        card: '',
        iconWrap: '',
        text: 'text-violet-500 dark:text-violet-400',
    },
    {
        key: 'kunjungan_langsung',
        label: 'Kunjungan Langsung',
        icon: Users,
        card: '',
        iconWrap: '',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'wbs',
        label: 'WBS',
        icon: ShieldAlert,
        card: '',
        iconWrap: '',
        text: 'text-amber-600 dark:text-amber-300',
    },
    {
        key: 'email',
        label: 'Email',
        icon: Mail,
        card: '',
        iconWrap: '',
        text: 'text-sky-500 dark:text-sky-400',
    },
    {
        key: 'website',
        label: 'Website',
        icon: Globe,
        card: '',
        iconWrap: '',
        text: 'text-sky-500 dark:text-sky-400',
    },
];

function StatCard({ item, value, compact = false }: { item: StatItem; value: number; compact?: boolean }) {
    const Icon = item.icon;

    return (
        <Card className={cn('border shadow-xs transition-shadow hover:shadow-sm', item.card)}>
            <CardContent className={cn('flex flex-col items-center gap-2 text-center', compact ? 'p-4' : 'p-6')}>
                <div className={cn('flex items-center justify-center rounded-full', item.iconWrap, compact ? 'size-9' : 'size-11')}>
                    <Icon className={compact ? 'size-4' : 'size-5'} />
                </div>
                <NumberTicker value={value} className={cn('font-bold tracking-tight', item.text, compact ? 'text-3xl' : 'text-4xl')} />
                <p className="text-muted-foreground text-xs font-medium">{item.label}</p>
            </CardContent>
        </Card>
    );
}

export function PublicStatsSection({ stats }: { stats: PublicStats }) {
    return (
        <section className="mb-14 space-y-6">
            {/* Total */}
            <Card className="mt-6 shadow-none">
                <CardContent className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <p className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">Jumlah Laporan Sekarang</p>
                    <NumberTicker value={stats.total} className="text-primary dark:text-primary text-6xl font-extrabold tracking-tight sm:text-7xl" />
                    <p className="text-muted-foreground text-sm">Seluruh pengaduan, aspirasi, dan permintaan informasi yang diterima</p>
                </CardContent>
            </Card>

            {/* Jenis laporan */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {classificationItems.map((item) => (
                    <StatCard key={item.key} item={item} value={stats[item.key]} />
                ))}
            </div>

            {/* Sumber kanal */}
            <div>
                <h3 className="text-muted-foreground mb-3 text-center text-sm font-semibold tracking-widest uppercase">Sumber Kanal</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {channelItems.map((item) => (
                        <StatCard key={item.key} item={item} value={stats[item.key]} compact />
                    ))}
                </div>
            </div>
        </section>
    );
}
