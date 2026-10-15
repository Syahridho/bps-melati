import { type SettingPageProps } from '@/types/pengaturan';
import { useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';

export function usePengaturanForm({ settings, flashSuccess }: { settings: SettingPageProps['settings']; flashSuccess?: string }) {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        nama_penanda_tangan: settings?.nama_penanda_tangan || '',
        jabatan_penanda_tangan: settings?.jabatan_penanda_tangan || 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings?.kota_penanda_tangan || 'Pekanbaru',
        auto_close_pengaduan_days: settings?.auto_close_pengaduan_days || '3',
        auto_close_aspirasi_days: settings?.auto_close_aspirasi_days || '1',
        auto_close_permintaan_informasi_days: settings?.auto_close_permintaan_informasi_days || '5',
    });

    useEffect(() => {
        if (flashSuccess) {
            setSuccessMessage(flashSuccess);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flashSuccess]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.application.update'));
    };

    return { data, setData, errors, processing, recentlySuccessful, successMessage, handleSubmit };
}
