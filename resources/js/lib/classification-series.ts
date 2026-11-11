import { type Classification } from '@/types/dashboard';

export interface ClassificationSeriesItem {
    key: Classification;
    label: string;
    color: string;
}

export const CLASSIFICATION_SERIES: ClassificationSeriesItem[] = [
    { key: 'pengaduan', label: 'Pengaduan', color: '#ef4444' },
    { key: 'aspirasi', label: 'Aspirasi', color: '#eab308' },
    { key: 'permintaan_informasi', label: 'Permintaan Informasi', color: '#6366f1' },
];

export const CLASSIFICATION_COLORS: Record<Classification, string> = Object.fromEntries(
    CLASSIFICATION_SERIES.map((item) => [item.key, item.color])
) as Record<Classification, string>;

export const CLASSIFICATION_LABELS: Record<Classification, string> = Object.fromEntries(
    CLASSIFICATION_SERIES.map((item) => [item.key, item.label])
) as Record<Classification, string>;
