import { AssignmentModeCard } from '@/components/organisms/settings/assignment-mode-card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type AssignmentSettingPageProps } from '@/types/settings';
import { Head, usePage } from '@inertiajs/react';

export default function PenugasanSettingsView() {
    const { assignmentMode } = usePage<AssignmentSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Penugasan',
            href: route('settings.application.penugasan'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Penugasan" />

            <SettingsLayout
                title="Penugasan"
                description="Kelola mode penanganan laporan (Round Robin / Ambil Tiket) dan pantau riwayat perubahan mode"
            >
                <AssignmentModeCard assignmentMode={assignmentMode} />
            </SettingsLayout>
        </AppLayout>
    );
}
