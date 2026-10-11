import { type Classification, type DashboardChannelCardConfig, type Status } from '@/types/dashboard';
import { Mail, Megaphone, Share2, ShieldAlert, Users } from 'lucide-react';

export const ADMIN_CHANNEL_CARDS: DashboardChannelCardConfig[] = [
    {
        key: 'span_lapor',
        label: 'SP4N-LAPOR!',
        card: 'border-violet-400/30 bg-violet-400/5',
        text: 'text-violet-600 dark:text-violet-400',
    },
    {
        key: 'sosial_media',
        label: 'Sosial Media',
        card: 'border-pink-400/30 bg-pink-400/5',
        text: 'text-pink-500 dark:text-pink-400',
    },
    {
        key: 'kunjungan_langsung',
        label: 'Kunjungan Langsung',
        card: 'border-lime-500/30 bg-lime-500/5',
        text: 'text-lime-600 dark:text-lime-400',
    },
    {
        key: 'wbs',
        label: 'WBS',
        card: 'border-orange-400/30 bg-orange-400/5',
        text: 'text-orange-600 dark:text-orange-400',
    },
    {
        key: 'email',
        label: 'Email',
        card: 'border-teal-400/30 bg-teal-400/5',
        text: 'text-teal-600 dark:text-teal-400',
    },
    {
        key: 'website',
        label: 'Website',
        card: 'border-sky-400/30 bg-sky-400/5',
        text: 'text-sky-500 dark:text-sky-400',
    },
];

export const OPERATOR_CHANNEL_CARDS: DashboardChannelCardConfig[] = [
    {
        key: 'span_lapor',
        label: 'SP4N-LAPOR!',
        desc: 'Layanan aspirasi nasional',
        icon: Megaphone,
        card: 'border-rose-400/25 bg-rose-400/5',
        iconWrap: 'bg-rose-400/15 text-rose-500 dark:text-rose-400',
        text: 'text-rose-500 dark:text-rose-400',
    },
    {
        key: 'sosial_media',
        label: 'Sosial Media',
        desc: 'IG, Facebook, YouTube, WhatsApp',
        icon: Share2,
        card: 'border-violet-400/25 bg-violet-400/5',
        iconWrap: 'bg-violet-400/15 text-violet-500 dark:text-violet-400',
        text: 'text-violet-500 dark:text-violet-400',
    },
    {
        key: 'kunjungan_langsung',
        label: 'Kunjungan Langsung',
        desc: 'Pelayanan & kotak saran',
        icon: Users,
        card: 'border-emerald-400/25 bg-emerald-400/5',
        iconWrap: 'bg-emerald-400/15 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'wbs',
        label: 'WBS',
        desc: 'Whistleblowing system',
        icon: ShieldAlert,
        card: 'border-amber-300/40 bg-amber-300/5',
        iconWrap: 'bg-amber-300/20 text-amber-600 dark:text-amber-300',
        text: 'text-amber-600 dark:text-amber-300',
    },
    {
        key: 'email',
        label: 'Email',
        desc: 'Laporan via surel',
        icon: Mail,
        card: 'border-sky-400/25 bg-sky-400/5',
        iconWrap: 'bg-sky-400/15 text-sky-500 dark:text-sky-400',
        text: 'text-sky-500 dark:text-sky-400',
    },
];

export function statusBadge(status: Status): { label: string; className: string } {
    switch (status) {
        case 'baru':
            return {
                label: 'Belum Dibalas',
                className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
            };
        case 'respon_awal':
            return {
                label: 'Respon Awal',
                className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
            };
        case 'respon_substantif':
            return {
                label: 'Respon Substantif',
                className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
            };
        case 'selesai':
            return {
                label: 'Selesai',
                className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            };
    }
}

export function classificationBadgeClass(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'border-transparent bg-red-500 text-white hover:bg-red-500';
        case 'aspirasi':
            return 'border-transparent bg-yellow-500 text-yellow-950 hover:bg-yellow-500';
        case 'permintaan_informasi':
            return 'border-transparent bg-indigo-500 text-white hover:bg-indigo-500';
    }
}

export function classificationBadgeVariant(classification: Classification): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}
