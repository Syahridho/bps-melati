import { type PublicStats } from '@/components/organisms/welcome/public-stats';
import { type SharedData } from '@/types';
import type { ElementType } from 'react';

export interface ChannelChild {
    id: number;
    name: string;
    slug?: string;
    color?: string | null;
}

export interface ChannelGroup {
    id: number;
    name: string;
    slug?: string;
    color?: string | null;
    children: ChannelChild[];
}

export interface AndroidReleaseMeta {
    available: boolean;
    version: string;
    size_bytes: number;
    released_at: string | null;
    release_notes: string | null;
    checksum_sha256: string;
}

export interface WelcomePageProps extends SharedData {
    flash: {
        ticket_number?: string;
    };
    channels: ChannelGroup[];
    stats: PublicStats;
    androidRelease?: AndroidReleaseMeta | null;
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

export interface TicketSuccessDialogProps {
    open: boolean;
    ticketNumber: string | null;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
}
