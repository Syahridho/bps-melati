import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';

export type SessionTerminationReason = 'taken_over' | 'forced_logout' | 'deactivated' | 'password_changed';

/** Payload `.session.terminated` (App\Events\SessionTerminated). */
export interface SessionTerminatedEvent {
    reason: SessionTerminationReason;
    message: string;
    actor_id: number | null;
}

/** Payload `.login.attempt.blocked` (App\Events\LoginAttemptBlocked). */
export interface LoginAttemptBlockedEvent {
    device: string | null;
    occurred_at: string | null;
    message: string;
}

/**
 * Memantau kanal privat `user.{id}` untuk dua hal:
 *  1. `.session.terminated` — sesi di perangkat ini sudah diakhiri pihak lain.
 *     Hard reload ke /login supaya tidak ada state Inertia yang tertinggal.
 *  2. `.login.attempt.blocked` — ada orang lain mencoba login ke akun ini.
 *
 * Bila WebSocket mati, middleware EnsureSingleSession tetap menegakkan aturan
 * pada request berikutnya, jadi ini murni lapisan UX yang lebih cepat.
 */
export function useSessionGuard(userId: number | null): void {
    useEcho<SessionTerminatedEvent>(
        userId === null ? `user.0` : `user.${userId}`,
        '.session.terminated',
        (event) => {
            const reason = new URLSearchParams(window.location.search).get('alasan') ?? event.reason;

            window.location.href = route('login', { alasan: reason });
        },
        [userId],
    );

    useEcho<LoginAttemptBlockedEvent>(
        userId === null ? `user.0` : `user.${userId}`,
        '.login.attempt.blocked',
        (event) => {
            toast.warning('Percobaan login lain terdeteksi', {
                description: event.occurred_at ? `${event.message} ${event.occurred_at}.` : event.message,
            });
        },
        [userId],
    );
}
