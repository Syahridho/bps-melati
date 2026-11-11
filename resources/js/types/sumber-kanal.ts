import { type SharedData } from '@/types';

export interface ChannelChildItem {
    id: number;
    name: string;
    slug: string;
    color: string | null;
    effective_color?: string | null;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    tickets_count: number;
}

export interface ChannelItem {
    id: number;
    name: string;
    slug: string;
    color: string | null;
    effective_color?: string | null;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    tickets_count: number;
    children: ChannelChildItem[];
}

export interface ChannelParentOption {
    id: number;
    name: string;
    slug: string;
}

export interface ChannelFormData {
    name: string;
    parent_id: string;
    color: string;
    sort_order: string;
    is_active: boolean;
    [key: string]: string | boolean;
}

export interface SumberKanalPageProps extends SharedData {
    channels: ChannelItem[];
    parents: ChannelParentOption[];
    flash: {
        success?: string;
        error?: string;
    };
}
