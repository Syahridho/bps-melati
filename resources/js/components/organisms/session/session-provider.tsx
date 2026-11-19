import { SessionGuard } from '@/hooks/use-session-guard';
import { useSessionHeartbeat } from '@/hooks/use-session-heartbeat';
import { router } from '@inertiajs/react';
import { type ReactNode, useEffect, useState } from 'react';

interface SessionProviderProps {
    children: ReactNode;
    /** Id user pada halaman pertama; Inertia tidak menyediakan `usePage` di sini. */
    initialUserId: number | null;
}

/**
 * Memasang lapisan sesi global di root aplikasi:
 *  - heartbeat `POST /session/ping` tiap menit saat tab terlihat,
 *  - listener realtime `.session.terminated` & `.login.attempt.blocked`.
 *
 * Keduanya dilewati untuk tamu (halaman login/register publik).
 *
 * CATATAN: komponen ini membungkus `<App>` sehingga berada DI LUAR konteks
 * Inertia — `usePage()` akan melempar "must be used within the Inertia
 * component". Karena itu id user diambil dari prop awal lalu diperbarui lewat
 * event global `router.on('navigate')`.
 */
export function SessionProvider({ children, initialUserId }: SessionProviderProps) {
    const [userId, setUserId] = useState<number | null>(initialUserId);

    useEffect(() => {
        const stopListening = router.on('navigate', (event) => {
            setUserId(readUserId(event.detail.page.props));
        });

        return stopListening;
    }, []);

    useSessionHeartbeat(userId !== null);

    return (
        <>
            <SessionGuard userId={userId} />
            {children}
        </>
    );
}

function readUserId(props: unknown): number | null {
    if (typeof props !== 'object' || props === null) {
        return null;
    }

    const auth = (props as { auth?: { user?: { id?: unknown } } }).auth;
    const id = auth?.user?.id;

    return typeof id === 'number' ? id : null;
}
