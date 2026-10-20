import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
// import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tema Tampilan',
        href: '/settings/appearance',
    },
];

export default function AppearancePage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tema Tampilan" />

            <SettingsLayout title="Tema Tampilan" description="Sesuaikan tema tampilan antarmuka sesuai kenyamanan Anda.">
                <div className="space-y-6">
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
