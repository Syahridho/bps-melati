import { API_ENDPOINTS } from '@/lib/api-docs';

export const METHOD_BADGE_CLASSES: Record<string, string> = {
    GET: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
};

export const RATE_LIMIT_NOTES = ['Tiket baru: 5/menit', 'Cek tiket: 20/menit', 'Balas/Selesaikan: 10/menit', 'Login token: 10/menit'];

export function authLabel(auth: string): string {
    if (auth === 'api-key') return 'API Key';
    if (auth === 'bearer') return 'Bearer';
    return 'Tidak perlu';
}

export function findEndpointPath(endpointId: string): string | undefined {
    return API_ENDPOINTS.find((e) => e.id === endpointId)?.path;
}
