import { type TrendPoint } from '@/components/chart-area-linear';
import { type BreadcrumbItem, type SharedData } from '@/types';
import type { ElementType } from 'react';

export type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
export type ChannelKey = 'span_lapor' | 'sosial_media' | 'kunjungan_langsung' | 'wbs' | 'email' | 'website';

export interface DashboardStats {
    total: number;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
    span_lapor: number;
    sosial_media: number;
    kunjungan_langsung: number;
    wbs: number;
    email: number;
    website?: number;
    baru: number;
    respon_awal: number;
    respon_substantif: number;
    selesai: number;
}

export interface TicketSummary {
    id: number;
    ticket_number: string;
    classification: Classification;
    reporter_name: string | null;
    content: string;
    status: Status;
    channel: string;
    created_at: string;
}

export interface DashboardProps extends SharedData {
    stats: DashboardStats;
    trend: TrendPoint[];
    recentTickets: TicketSummary[];
    periodLabel: string;
}

export interface DashboardChannelCardConfig {
    key: ChannelKey;
    label: string;
    desc?: string;
    icon?: ElementType;
    card: string;
    iconWrap?: string;
    text: string;
}

export interface DashboardTemplateProps extends DashboardProps {
    title: string;
    headerTitle: string;
    breadcrumbs: BreadcrumbItem[];
    channelCards: DashboardChannelCardConfig[];
    variant: 'admin' | 'operator';
    allTicketsRoute: string;
    ticketDetailRouteName: string;
}
