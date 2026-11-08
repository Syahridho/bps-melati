import { type SettingPageProps } from '@/types/pengaturan';
import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function usePengaturanForm({ settings, flashSuccess }: { settings: SettingPageProps['settings']; flashSuccess?: string }) {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const flashSuccessRef = useRef<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);

    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        nama_penanda_tangan: settings?.nama_penanda_tangan || '',
        jabatan_penanda_tangan: settings?.jabatan_penanda_tangan || 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings?.kota_penanda_tangan || 'Pekanbaru',
        auto_close_pengaduan_days: settings?.auto_close_pengaduan_days || '3',
        auto_close_aspirasi_days: settings?.auto_close_aspirasi_days || '1',
        auto_close_permintaan_informasi_days: settings?.auto_close_permintaan_informasi_days || '5',
        kadar_pengawasan_hari: settings?.kadar_pengawasan_hari || '30',
        dashboard_live_enabled: settings?.dashboard_live_enabled ?? true,
    });

    useEffect(() => {
        const message = flashSuccess ?? null;
        if (!message || message === flashSuccessRef.current) {
            return;
        }

        if (flashTimerRef.current !== null) {
            window.clearTimeout(flashTimerRef.current);
        }

        flashSuccessRef.current = message;
        setSuccessMessage(message);
        flashTimerRef.current = window.setTimeout(() => {
            setSuccessMessage(null);
            flashSuccessRef.current = null;
            flashTimerRef.current = null;
        }, 5000);

        return () => {
            if (flashTimerRef.current !== null) {
                window.clearTimeout(flashTimerRef.current);
                flashTimerRef.current = null;
            }
        };
    }, [flashSuccess]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.application.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Pengaturan berhasil diperbarui!');
            },
        });
    };

    return { data, setData, errors, processing, recentlySuccessful, successMessage, handleSubmit };
}
