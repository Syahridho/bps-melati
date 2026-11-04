import { type SharedData, type User } from '@/types';
import { usePage } from '@inertiajs/react';

export type UserRoleType = 'admin' | 'operator' | 'operator_tim';

export interface AuthRoleInfo {
    user: User | null;
    role: UserRoleType | null;
    isAdmin: boolean;
    isOperator: boolean;
    isOperatorTim: boolean;
    canAccessInbox: boolean;
}

/**
 * Satu-satunya sumber role dan user autentikasi di frontend.
 * Diambil eksklusif dari props shared Inertia `auth.user`.
 */
export function useAuthRole(): AuthRoleInfo {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user ?? null;
    const role = (user?.role as UserRoleType) ?? null;

    return {
        user,
        role,
        isAdmin: role === 'admin',
        isOperator: role === 'operator',
        isOperatorTim: role === 'operator_tim',
        canAccessInbox: role === 'admin' || role === 'operator',
    };
}
