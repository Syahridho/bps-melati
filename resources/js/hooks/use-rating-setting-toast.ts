import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useRef } from 'react';
import { toast } from 'sonner';

interface RatingSettingChangedEvent {
    enabled: boolean;
    changed_by?: string | null;
    changed_at?: string | null;
}

export function useRatingSettingToast() {
    const { auth } = usePage<SharedData>().props;
    const isStaff = !!auth?.user;
    const seenRef = useRef<Set<string>>(new Set());

    useEcho<RatingSettingChangedEvent>(
        isStaff ? 'staff' : '',
        '.rating.setting.changed',
        (event) => {
            const key = `${event.enabled}-${event.changed_at ?? ''}`;
            if (seenRef.current.has(key)) {
                return;
            }
            if (seenRef.current.size >= 100) {
                seenRef.current.clear();
            }
            seenRef.current.add(key);

            toast.info(event.enabled ? 'Penilaian pelapor dinyalakan' : 'Penilaian pelapor dimatikan');
        },
        [isStaff],
    );
}