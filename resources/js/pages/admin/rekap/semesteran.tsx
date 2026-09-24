import AdminPage from '@/pages/admin/page';

export default function RekapSemesteran() {
    return (
        <AdminPage
            title="Rekap Semesteran"
            description="Rekapitulasi laporan per semester"
            breadcrumbs={[
                { title: 'Rekap', href: '/dashboard/admin/rekap-semesteran' },
                { title: 'Semesteran', href: '/dashboard/admin/rekap-semesteran' },
            ]}
        />
    );
}
