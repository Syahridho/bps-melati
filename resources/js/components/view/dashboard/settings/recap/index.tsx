import { SettingsSubmitButton } from '@/components/molecules/settings-submit-button';
import { PengaturanSignatureFields } from '@/components/organisms/settings/settings-signature-fields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type ReportSignatureSettingPageProps, type ReportSignatureSettingValues } from '@/types/settings';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';

export default function RecapSettingsView() {
    const { settings, flash } = usePage<ReportSignatureSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Laporan & Tanda Tangan',
            href: route('settings.recap'),
        },
    ];

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<ReportSignatureSettingValues>({
        nama_penanda_tangan: settings.nama_penanda_tangan ?? '',
        jabatan_penanda_tangan: settings.jabatan_penanda_tangan ?? 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings.kota_penanda_tangan ?? 'Pekanbaru',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('settings.recap.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Pengaturan laporan & tanda tangan berhasil disimpan.'),
            onError: () => toast.error('Gagal menyimpan pengaturan laporan & tanda tangan. Periksa kembali isian Anda.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Laporan & Tanda Tangan" />

            <SettingsLayout
                title="Laporan & Tanda Tangan"
                description="Kelola nama pejabat, jabatan penanda tangan, dan kota cetak lembar laporan rekap"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Penanda Tangan Rekap & Laporan</CardTitle>
                        <CardDescription>
                            Pengaturan nama dan informasi pejabat penanda tangan yang akan tercetak secara dinamis pada rekap laporan.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <PengaturanSignatureFields data={data} setData={setData} errors={errors} />

                            <SettingsSubmitButton processing={processing} recentlySuccessful={recentlySuccessful} successMessage={flash?.success} />
                        </form>
                    </CardContent>
                </Card>
            </SettingsLayout>
        </AppLayout>
    );
}
