import { SettingsSubmitButton } from '@/components/molecules/settings-submit-button';
import { PengaturanSignatureFields } from '@/components/organisms/settings/settings-signature-fields';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type ReportSignatureSettingPageProps, type ReportSignatureSettingValues } from '@/types/settings';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';

export default function LaporanSettingsView() {
    const { settings, flash } = usePage<ReportSignatureSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Laporan & Tanda Tangan',
            href: route('settings.application.laporan'),
        },
    ];

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<ReportSignatureSettingValues>({
        nama_penanda_tangan: settings.nama_penanda_tangan ?? '',
        jabatan_penanda_tangan: settings.jabatan_penanda_tangan ?? 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings.kota_penanda_tangan ?? 'Pekanbaru',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.application.laporan.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Laporan & Tanda Tangan" />

            <SettingsLayout
                title="Laporan & Tanda Tangan"
                description="Kelola nama pejabat, jabatan penanda tangan, dan kota cetak lembar laporan rekap"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <PengaturanSignatureFields data={data} setData={setData} errors={errors} />

                    <SettingsSubmitButton
                        processing={processing}
                        recentlySuccessful={recentlySuccessful}
                        successMessage={flash?.success}
                    />
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
