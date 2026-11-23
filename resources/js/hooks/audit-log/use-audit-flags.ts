import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupFlags } from '@/lib/audit-log';
import type { AuditFlag } from '@/types/audit-log';

export function useAuditFlags(enabled: boolean, active: boolean) {
    const [flags, setFlags] = useState<AuditFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('baru');

    const refresh = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const res = await axios.get(route('audit-flag.index'), {
                    params: statusFilter ? { status: statusFilter } : {},
                });
                setFlags(res.data.flags ?? []);
                setError(null);
            } catch (e) {
                setError('Gagal memuat penanda');
                console.error(e);
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [statusFilter],
    );

    useEffect(() => {
        if (enabled) refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (enabled && active) refresh(true);
    }, [enabled, active, refresh]);

    const groups = useMemo(() => groupFlags(flags.filter((f) => !typeFilter || f.type === typeFilter)), [flags, typeFilter]);

    return { groups, loading, error, typeFilter, setTypeFilter, statusFilter, setStatusFilter, refresh };
}
