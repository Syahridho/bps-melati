import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/layout/appearance-tabs';
import HeadingSmall from '@/components/shared/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Pengaturan',
        href: route('settings.application.edit'),
    },
    {
        title: 'Pengaturan Tema',
        href: '/settings/appearance',
    },
];

export default function AppearanceView() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Tema" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Pengaturan Tema" description="Perbarui pengaturan tampilan akun Anda" />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
