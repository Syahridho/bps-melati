import { type Operator } from '@/types/operator';
import { useConnectionStatus, useEcho, useEchoPresence } from '@laravel/echo-react';
import { useEffect, useMemo, useState } from 'react';

export interface UserLoggedInEvent {
    id: number;
    last_login_at: string | null;
    last_login_device: string;
    last_login_ip: string | null;
    has_session: boolean;
}

interface PresenceMember {
    id: number;
}

export function useOperatorPresence(initialOperators: Operator[], isAdmin: boolean) {
    const connectionStatus = useConnectionStatus();
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(() => new Set());
    const [operators, setOperators] = useState<Operator[]>(initialOperators);

    useEffect(() => {
        setOperators(initialOperators);
    }, [initialOperators]);

    const { channel } = useEchoPresence<PresenceMember>(
        isAdmin ? 'online-users' : '',
        [],
        () => {},
        [isAdmin],
    );

    useEffect(() => {
        const active = channel();
        if (!active) {
            return;
        }

        active.here((members: PresenceMember[]) => {
            setOnlineUserIds(new Set(members.map((m) => m.id)));
        });

        active.joining((member: PresenceMember) => {
            setOnlineUserIds((prev) => new Set([...prev, member.id]));
        });

        active.leaving((member: PresenceMember) => {
            setOnlineUserIds((prev) => {
                const next = new Set(prev);
                next.delete(member.id);
                return next;
            });
        });
    }, [channel]);

    useEcho<UserLoggedInEvent>(
        isAdmin ? 'admin.operators' : '',
        'UserLoggedIn',
        (event) => {
            setOperators((prev) =>
                prev.map((op) =>
                    op.id === event.id
                        ? {
                              ...op,
                              last_login_at: event.last_login_at,
                              last_login_device: event.last_login_device,
                              last_login_ip: event.last_login_ip,
                              has_session: event.has_session,
                          }
                        : op,
                ),
            );
        },
        [isAdmin],
    );

    const mergedOperators = useMemo(() => {
        const isConnected = connectionStatus === 'connected';

        return operators.map((op) => ({
            ...op,
            is_online: isConnected ? onlineUserIds.has(op.id) : op.is_online,
        }));
    }, [operators, onlineUserIds, connectionStatus]);

    return {
        operators: mergedOperators,
        connectionStatus,
    };
}
