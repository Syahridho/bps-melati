import { type PaginatedData } from '@/components/pagination';
import { type SharedData } from '@/types';

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
    };
    flash: {
        success?: string;
    };
}
