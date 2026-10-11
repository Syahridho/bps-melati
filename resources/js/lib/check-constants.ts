import { type Classification, type Status } from '@/types/check';
import { CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import type { ElementType } from 'react';

export function classificationLabel(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
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

export interface StatusConfigInfo {
    label: string;
    colorClass: string;
    icon: ElementType;
}

export function statusConfig(status: Status): StatusConfigInfo {
    switch (status) {
        case 'baru':
            return {
                label: 'Menunggu Tanggapan',
                colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                icon: Clock,
            };
        case 'respon_awal':
            return {
                label: 'Respon Awal Dilakukan',
                colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
                icon: MessageSquare,
            };
        case 'respon_substantif':
            return {
                label: 'Respon Substantif Diberikan',
                colorClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                icon: MessageSquare,
            };
        case 'selesai':
            return {
                label: 'Selesai',
                colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                icon: CheckCircle2,
            };
    }
}

export function responseTypeLabel(type: string): string {
    switch (type) {
        case 'respon_awal':
            return 'Respon Petugas';
        case 'respon_substantif':
            return 'Respon Petugas';
        case 'balasan_pelapor':
            return 'Balasan Pelapor';
        default:
            return type;
    }
}
