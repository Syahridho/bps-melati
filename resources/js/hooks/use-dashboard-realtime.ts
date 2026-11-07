import { router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
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
                only: ['stats', 'trend', 'recentTickets', 'isLiveEnabled'],
            });
        }, RELOAD_DEBOUNCE_MS);
    }, [enabled]);

    useEcho<DashboardUpdatedEvent>(
        'dashboard.admin',
        '.dashboard.updated',
        () => {
            if (enabled) {
                scheduleReload();
            }
        },
        [enabled],
    );

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
