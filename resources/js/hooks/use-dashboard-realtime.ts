import { useAuthRole } from '@/hooks/use-auth-role';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const RELOAD_DEBOUNCE_MS = 500;

export interface DashboardUpdatedEvent {
    type: 'created' | 'status_changed' | 'deleted';
    ticket_id: number;
    classification?: string;
    channel?: string;
    old_status?: string;
    new_status?: string;
    ticket?: Record<string, unknown>;
}

export interface ChannelStatsUpdatedEvent {
    channel_id: number;
    action: string;
    name: string;
    color: string | null;
}

export function useDashboardRealtime(enabled: boolean = true) {
    const [isLive, setIsLive] = useState<boolean>(enabled);
    const debounceRef = useRef<number | null>(null);

    const scheduleReload = useCallback(() => {
        if (!enabled) return;

        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            router.reload({
                only: ['stats', 'trend', 'recentTickets', 'isLiveEnabled', 'sumberKanal'],
            });
        }, RELOAD_DEBOUNCE_MS);
    }, [enabled]);

    const { auth } = usePage<SharedData>().props;
    const { isAdmin } = useAuthRole();
    const canSubscribe = enabled && !!auth?.user && isAdmin;

    useEffect(() => {
        if (!canSubscribe) {
            return;
        }

        const echoInstance = (window as unknown as {
            Echo?: {
                private: (channel: string) => {
                    listen: (event: string, callback: () => void) => void;
                    stopListening: (event: string, callback?: () => void) => void;
                };
            };
        }).Echo;

        const channel = echoInstance?.private('dashboard.admin');
        if (!channel) {
            return;
        }

        const handler = () => {
            scheduleReload();
        };

        channel.listen('.dashboard.updated', handler);
        channel.listen('.channel.stats.updated', handler);

        return () => {
            channel.stopListening('.dashboard.updated', handler);
            channel.stopListening('.channel.stats.updated', handler);
        };
    }, [canSubscribe, scheduleReload]);

    useEffect(() => {
        if (!enabled) {
            setIsLive(false);
            return;
        }

        // Monitor status koneksi Echo via window.Echo bila tersedia
        const echoInstance = (window as unknown as { Echo?: { connector?: { pusher?: { connection?: { state: string; bind: (event: string, cb: () => void) => void; unbind: (event: string, cb: () => void) => void } } } } }).Echo;
        const pusherConnection = echoInstance?.connector?.pusher?.connection;

        if (pusherConnection) {
            const handleConnected = () => {
                setIsLive(true);
                scheduleReload(); // Sync data saat koneksi kembali
            };
            const handleDisconnected = () => setIsLive(false);

            setIsLive(pusherConnection.state === 'connected');

            pusherConnection.bind('connected', handleConnected);
            pusherConnection.bind('disconnected', handleDisconnected);
            pusherConnection.bind('unavailable', handleDisconnected);
            pusherConnection.bind('failed', handleDisconnected);

            return () => {
                pusherConnection.unbind('connected', handleConnected);
                pusherConnection.unbind('disconnected', handleDisconnected);
                pusherConnection.unbind('unavailable', handleDisconnected);
                pusherConnection.unbind('failed', handleDisconnected);
                if (debounceRef.current !== null) {
                    window.clearTimeout(debounceRef.current);
                }
            };
        }

        return () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, [enabled, scheduleReload]);

    return { isLive: enabled ? isLive : false };
}
