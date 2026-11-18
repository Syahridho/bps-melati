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
