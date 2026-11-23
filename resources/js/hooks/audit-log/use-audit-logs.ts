import { useEcho } from '@laravel/echo-react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AuditLog, Severity } from '@/types/audit-log';

export function useAuditLogs(enabled: boolean, active: boolean) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newCount, setNewCount] = useState(0);
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('');

    const refresh = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(route('audit-log.index'), { params: { per_page: 50 } });
            setLogs(res.data.logs ?? []);
            setError(null);
        } catch (e) {
            setError('Gagal memuat log audit');
            console.error(e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEcho(
        enabled ? 'audit.log' : '',
        '.audit.log.created',
        (event: Record<string, unknown>) => {
            const newLog: AuditLog = {
                id: Number(event.id),
                event_type: String(event.event_type ?? ''),
                category: String(event.category ?? ''),
                severity: (event.severity as Severity) || 'info',
                actor_name: (event.actor_name as string) || null,
                actor_role: (event.actor_role as string) || null,
                ticket_number: (event.ticket_number as string) ?? (event.ticket_id ? `#${event.ticket_id}` : null),
                ip: (event.ip as string) || null,
                created_at: (event.created_at as string) || new Date().toISOString(),
            };
            setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
            setNewCount((n) => n + 1);
        },
        [enabled],
    );

    // load awal + polling
    useEffect(() => {
        if (!enabled) return;
        refresh();
        const id = setInterval(() => refresh(true), 15000);
        return () => clearInterval(id);
    }, [enabled, refresh]);

    // segarkan diam-diam saat tab dibuka
    useEffect(() => {
        if (enabled && active) refresh(true);
    }, [enabled, active, refresh]);

    const filtered = useMemo(
        () => logs.filter((l) => (!category || l.category === category) && (!severity || l.severity === severity)),
        [logs, category, severity],
    );

    const manualRefresh = () => {
        setNewCount(0);
        return refresh();
    };

    return { logs: filtered, loading, error, newCount, category, setCategory, severity, setSeverity, refresh: manualRefresh };
}
