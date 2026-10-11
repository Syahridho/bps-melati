import { PengaturanAutoCloseFields } from '@/components/pengaturan-auto-close-fields';
import { PengaturanSignatureFields } from '@/components/pengaturan-signature-fields';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePengaturanForm } from '@/hooks/use-pengaturan-form';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type SettingPageProps } from '@/types/pengaturan';
import { Transition } from '@headlessui/react';
import { Head, usePage } from '@inertiajs/react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

export default function ApplicationSettings() {
    const { settings, flash } = usePage<SettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Pengaturan',
            href: route('settings.application.edit'),
        },
    ];

    const { data, setData, errors, processing, recentlySuccessful, successMessage, handleSubmit } = usePengaturanForm({
        settings,
        flashSuccess: flash?.success,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Aplikasi" />

            <SettingsLayout
                title="Pengaturan"
                description="Kelola pengaturan aplikasi, batas waktu otomatis selesai, dan informasi penanda tangan rekap"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <PengaturanAutoCloseFields data={data} setData={setData} errors={errors} />

                    <Separator />

                    <PengaturanSignatureFields data={data} setData={setData} errors={errors} />

                    <div className="flex items-center gap-4 pt-2">
                        <Button disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Pengaturan
                        </Button>

                        <Transition
                            show={recentlySuccessful || !!successMessage}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {successMessage || 'Tersimpan'}
                            </p>
                        </Transition>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
