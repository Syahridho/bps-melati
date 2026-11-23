import { SettingsSubmitButton } from '@/components/molecules/settings-submit-button';
import { PengaturanAutoCloseFields } from '@/components/organisms/settings/settings-auto-close-fields';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type AutoCloseSettingPageProps, type AutoCloseSettingValues } from '@/types/settings';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';

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
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Auto Close" />

            <SettingsLayout
                title="Batas Waktu Otomatis Selesai"
                description="Kelola batas waktu otomatis selesai per jenis laporan dan batas hari kadar pengawasan"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <PengaturanAutoCloseFields data={data} setData={setData} errors={errors} />

                    <SettingsSubmitButton processing={processing} recentlySuccessful={recentlySuccessful} successMessage={flash?.success} />
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
