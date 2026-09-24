import AdminPage from '@/pages/admin/page';

export default function RekapBulanan() {
    return (
        <AdminPage
            title="Rekap Bulanan"
            description="Rekapitulasi laporan per bulan"
            breadcrumbs={[
                { title: 'Rekap', href: '/dashboard/admin/rekap-bulanan' },
                { title: 'Bulanan', href: '/dashboard/admin/rekap-bulanan' },
            ]}
        />
    );
}
