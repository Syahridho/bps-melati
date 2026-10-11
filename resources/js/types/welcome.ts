import { type PublicStats } from '@/components/public-stats';
import { type SharedData } from '@/types';
import type { ElementType } from 'react';

export interface ChannelChild {
    id: number;
    name: string;
}

export interface ChannelGroup {
    id: number;
    name: string;
    children: ChannelChild[];
}

export interface WelcomePageProps extends SharedData {
    flash: {
        ticket_number?: string;
    };
    channels: ChannelGroup[];
    stats: PublicStats;
}

export type ClassificationType = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';

export interface StoredTicket {
    ticket_number: string;
    created_at: string;
}

export interface ClassificationOption {
    value: ClassificationType;
    label: string;
    description: string;
    icon: ElementType;
    iconClass: string;
}

export interface AlurStep {
    icon: ElementType;
    title: string;
    description: string;
}
