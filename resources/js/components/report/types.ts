import { type ClassificationType } from '@/types/welcome';
import { type ChangeEvent, type FormEvent, type RefObject } from 'react';

export interface ReportFormData {
    classification: ClassificationType | '';
    channel_id: string;
    reporter_name: string;
    reporter_email: string;
    reporter_wa: string;
    title: string;
    content: string;
    service_type: string;
    tanggal_kejadian: string;
    satuan_tugas: string;
    attachments: File[];
}

export interface ReportFormProps {
    data: ReportFormData;
    setData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
    processing: boolean;
    errors: Partial<Record<keyof ReportFormData | string, string>>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onSubmit: (e: FormEvent) => void;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onPreviewFile: (file: File) => void;
}
