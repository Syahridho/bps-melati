import { type LaporanChangedEvent } from '@/hooks/use-reports-realtime';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const BATCH_WINDOW_MS = 1500;
const TOAST_DURATION_MS = 5000;
const MAX_SEEN_IDS = 200;

interface UseNewTicketToastOptions {
    enabled?: boolean;
    routePrefix?: 'dashboard.admin' | 'dashboard.operator';
    onlyInputData?: boolean;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
    pengaduan: 'Pengaduan',
    aspirasi: 'Aspirasi',
    permintaan_informasi: 'Permintaan informasi',
};

function formatClassificationLabel(type: string): string {
    return CLASSIFICATION_LABELS[type] ?? 'Data';
}

function buildBatchDescription(batch: LaporanChangedEvent[]): string {
    const channels = Array.from(new Set(batch.map((item) => item.channel_name).filter((name): name is string => Boolean(name))));

    if (channels.length === 1) {
        return `Semua dari ${channels[0]}`;
    }

    const countsByType = new Map<string, number>();
    for (const item of batch) {
        const label = formatClassificationLabel(item.type);
        countsByType.set(label, (countsByType.get(label) ?? 0) + 1);
    }

    return Array.from(countsByType.entries())
        .map(([label, count]) => `${count} ${label}`)
        .join(', ');
}

/**
 * Mengumpulkan event `created` dalam jendela singkat (1,5 detik) agar burst
 * (mis. import sosial media) tampil sebagai satu toast ringkas tanpa data sensitif.
 */
export function useNewTicketToast({
    enabled = true,
    routePrefix = 'dashboard.admin',
    onlyInputData = true,
}: UseNewTicketToastOptions = {}) {
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const routePrefixRef = useRef(routePrefix);
    routePrefixRef.current = routePrefix;

    const onlyInputDataRef = useRef(onlyInputData);
    onlyInputDataRef.current = onlyInputData;

    const bufferRef = useRef<LaporanChangedEvent[]>([]);
    const timerRef = useRef<number | null>(null);
    const seenIdsRef = useRef<Set<number>>(new Set());

    const flush = useCallback(() => {
        timerRef.current = null;
        const batch = bufferRef.current;
        bufferRef.current = [];

        if (batch.length === 0 || !enabledRef.current) {
            return;
        }

        if (batch.length === 1) {
            const item = batch[0];
            const typeLabel = formatClassificationLabel(item.type);
            const description = item.channel_name ? `${typeLabel} baru dari ${item.channel_name}` : `${typeLabel} baru (#${item.ticket_number})`;

            toast.info('Data baru masuk', {
                id: `input-data-created-${item.id}`,
                description,
                duration: TOAST_DURATION_MS,
                action: {
                    label: 'Lihat',
                    onClick: () => router.visit(route(`${routePrefixRef.current}.input-data.show`, item.ticket_number)),
                },
            });

            return;
        }

        toast.info(`${batch.length} data baru masuk`, {
            id: `input-data-created-batch-${batch[0].id}`,
            description: buildBatchDescription(batch),
            duration: TOAST_DURATION_MS,
        });
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            bufferRef.current = [];
        };
    }, []);

    return useCallback(
        (event: LaporanChangedEvent) => {
            if (!enabledRef.current) {
                return;
            }

            if (onlyInputDataRef.current && event.is_input_data !== true) {
                return;
            }

            if (seenIdsRef.current.has(event.id)) {
                return;
            }

            if (seenIdsRef.current.size >= MAX_SEEN_IDS) {
                seenIdsRef.current.clear();
            }
            seenIdsRef.current.add(event.id);

            bufferRef.current.push(event);

            if (timerRef.current === null) {
                timerRef.current = window.setTimeout(flush, BATCH_WINDOW_MS);
            }
        },
        [flush],
    );
}
