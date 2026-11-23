import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export function useAuditSummary(enabled: boolean, active: boolean) {
    const [summary, setSummary] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(route('audit-log.summary-weekly'));
            setSummary(res.data);
            setError(null);
        } catch (e) {
            setError('Gagal memuat ringkasan');
            console.error(e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled) refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (enabled && active) refresh(true);
    }, [enabled, active, refresh]);

    return { summary, loading, error, refresh };
}
