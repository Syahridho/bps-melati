import { type SharedData } from '@/types';

export interface SettingValues {
    nama_penanda_tangan: string;
    jabatan_penanda_tangan: string;
    kota_penanda_tangan: string;
    auto_close_pengaduan_days: string;
    auto_close_aspirasi_days: string;
    auto_close_permintaan_informasi_days: string;
}

export interface SettingPageProps extends SharedData {
    settings: SettingValues;
    flash: {
        success?: string;
    };
}

export type SetSettingField = <K extends keyof SettingValues>(field: K, value: SettingValues[K]) => void;
