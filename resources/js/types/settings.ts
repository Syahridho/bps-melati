import { type SharedData } from '@/types';
import { FormEvent } from 'react';

export interface SettingValues {
    nama_penanda_tangan: string;
    jabatan_penanda_tangan: string;
    kota_penanda_tangan: string;
    auto_close_pengaduan_days: string;
    auto_close_aspirasi_days: string;
    auto_close_permintaan_informasi_days: string;
    kadar_pengawasan_hari: string;
}

export type AssignmentModeValue = 'free' | 'claim' | 'round_robin';

export interface AssignmentModeOption {
    value: AssignmentModeValue;
    label: string;
    description: string;
}

export interface AssignmentModePending {
    mode: AssignmentModeValue;
    label: string;
    scheduled_at: string | null;
}

export interface AssignmentModeHistoryItem {
    id: number;
    old_label: string | null;
    new_label: string | null;
    changed_by_name: string | null;
    scheduled_at: string | null;
    applied_at: string | null;
    cancelled_at: string | null;
    status: 'applied' | 'cancelled' | 'scheduled';
}

export interface AssignmentModeSettings {
    current: AssignmentModeValue;
    current_label: string;
    options: AssignmentModeOption[];
    pending: AssignmentModePending | null;
    history: AssignmentModeHistoryItem[];
}

export interface SettingPageProps extends SharedData {
    settings: SettingValues;
    assignmentMode: AssignmentModeSettings;
    flash: {
        success?: string;
    };
}

export interface NotificationSettingsPageProps extends SharedData {
    dashboardLiveEnabled: boolean;
    canManageGlobal: boolean;
}

export type SetSettingField = <K extends keyof SettingValues>(field: K, value: SettingValues[K]) => void;

// API
export interface ApiSettingsProps {
    baseUrl: string;
    apiKeyHeaderName: string;
}

// Sumber Kanal

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

export interface ChannelFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: ChannelFormData;
    setData: <K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) => void;
    errors: Partial<Record<keyof ChannelFormData, string>>;
    processing: boolean;
    parents: ChannelParentOption[];
    editingId?: number | null;
    onSubmit: (e: FormEvent) => void;
}

export interface ChannelDeleteDialogProps {
    open: boolean;
    channel: ChannelItem | ChannelChildItem | null;
    onClose: () => void;
    onConfirm: () => void;
}

// Sensor
export interface CensoredWordItem {
    id: number;
    word: string;
    match_type: 'anywhere' | 'whole_word';
    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface SensorsPageProps {
    words: CensoredWordItem[];
}

export interface SensorFormData {
    word: string;
    match_type: 'anywhere' | 'whole_word';
    is_active: boolean;
    [key: string]: string | boolean;
}

export interface SensorBulkFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export interface SensorDeleteDialogProps {
    open: boolean;
    word: CensoredWordItem | null;
    onClose: () => void;
    onConfirm: () => void;
}

export interface SensorFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: SensorFormData;
    setData: <K extends keyof SensorFormData>(key: K, value: SensorFormData[K]) => void;
    errors: Partial<Record<keyof SensorFormData, string>>;
    processing: boolean;
    editingId?: number | null;
    onSubmit: (e: FormEvent) => void;
}
