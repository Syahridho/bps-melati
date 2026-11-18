import { type PaginatedData } from '@/components/shared/pagination';
import { type SharedData } from '@/types';
import { FormEvent } from 'react';

export interface Operator {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    is_online: boolean;
    last_active_at: string | null;
    last_login_at: string | null;
    last_login_device: string;
    last_login_ip: string | null;
    has_session: boolean;
}

export interface OperatorFormData {
    name: string;
    role: string;
    email: string;
    password: string;
    [key: string]: string;
}

export interface OperatorPageProps extends SharedData {
    operators: PaginatedData<Operator>;
    filters: {
        search: string;
        per_page: number;
        roles: string[];
        available_roles: string[];
    };
    flash: {
        success?: string;
    };
}

export interface OperatorFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    data: OperatorFormData;
    setData: <K extends keyof OperatorFormData>(key: K, value: OperatorFormData[K]) => void;
    errors: Partial<Record<keyof OperatorFormData, string>>;
    processing: boolean;
    onSubmit: (e: FormEvent) => void;
}

export interface OperatorDeleteDialogProps {
    open: boolean;
    operator: Operator | null;
    onClose: () => void;
    onConfirm: () => void;
}
