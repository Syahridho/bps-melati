import AdminPage from '@/pages/admin/page';

export default function RekapTahunan() {
    return (
        <AdminPage
            title="Rekap Tahunan"
            description="Rekapitulasi laporan per tahun"
            breadcrumbs={[
                { title: 'Rekap', href: '/dashboard/admin/rekap-tahunan' },
                { title: 'Tahunan', href: '/dashboard/admin/rekap-tahunan' },
            ]}
        />
    );
}
