import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEchoPresence } from '@laravel/echo-react';

/**
 * Bergabung ke presence channel global `online-users`.
 * Menandai user aktif selama tab terbuka.
 */
export function useOnlinePresence() {
    const { auth } = usePage<SharedData>().props;
    const userId = auth?.user?.id ?? null;

    useEchoPresence(userId ? 'online-users' : '', [], () => {}, [userId]);
}
