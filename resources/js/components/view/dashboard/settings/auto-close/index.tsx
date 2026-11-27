import { SettingsSubmitButton } from '@/components/molecules/settings-submit-button';
import { PengaturanAutoCloseFields } from '@/components/organisms/settings/settings-auto-close-fields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type AutoCloseSettingPageProps, type AutoCloseSettingValues } from '@/types/settings';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';

export default function AutoCloseSettingsView() {
    const { settings, flash } = usePage<AutoCloseSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Auto Close',
            href: route('settings.auto-close'),
        },
    ];

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<AutoCloseSettingValues>({
        auto_close_pengaduan_days: settings.auto_close_pengaduan_days ?? '3',
        auto_close_aspirasi_days: settings.auto_close_aspirasi_days ?? '1',
        auto_close_permintaan_informasi_days: settings.auto_close_permintaan_informasi_days ?? '5',
        kadar_pengawasan_hari: settings.kadar_pengawasan_hari ?? '30',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.auto-close.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Pengaturan auto close berhasil disimpan.'),
            onError: () => toast.error('Gagal menyimpan pengaturan auto close. Periksa kembali isian Anda.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Auto Close" />

            <SettingsLayout
                title="Batas Waktu Otomatis Selesai"
                description="Kelola batas waktu otomatis selesai per jenis laporan dan batas hari kadar pengawasan"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Batas Waktu Otomatis Selesai (Auto Close)</CardTitle>
                        <CardDescription>
                            Jumlah hari tanpa balasan dari pelapor setelah petugas memberikan respon sebelum tiket secara otomatis ditandai selesai.
                            Isi 0 untuk menonaktifkan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <PengaturanAutoCloseFields data={data} setData={setData} errors={errors} />

                            <SettingsSubmitButton processing={processing} recentlySuccessful={recentlySuccessful} successMessage={flash?.success} />
                        </form>
                    </CardContent>
                </Card>
            </SettingsLayout>
        </AppLayout>
    );
}
