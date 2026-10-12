import { useEcho } from '@laravel/echo-react';
import React from 'react';
import { toast } from 'sonner';

export type SessionTerminationReason = 'taken_over' | 'forced_logout' | 'deactivated' | 'password_changed';

export interface SessionTerminatedEvent {
    reason: SessionTerminationReason;
    message: string;
    actor_id: number | null;
}

export interface LoginAttemptBlockedEvent {
    device: string | null;
    occurred_at: string | null;
    message: string;
}

function SessionGuardListeners({ userId }: { userId: number }) {
    useEcho<SessionTerminatedEvent>(
        'user.' + userId,
        '.session.terminated',
        (event) => {
            const reason = new URLSearchParams(window.location.search).get('alasan') ?? event.reason;
            window.location.href = route('login', { alasan: reason });
        },
        [userId],
    );

    useEcho<LoginAttemptBlockedEvent>(
        'user.' + userId,
        '.login.attempt.blocked',
        (event) => {
            toast.warning('Percobaan login lain terdeteksi', {
                description: event.occurred_at ? event.message + ' ' + event.occurred_at + '.' : event.message,
            });
        },
        [userId],
    );

    return null;
}

export function SessionGuard({ userId }: { userId: number | null }) {
    if (userId === null) {
        return null;
    }
    return React.createElement(SessionGuardListeners, { userId });
}
