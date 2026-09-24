import AdminPage from '@/pages/admin/page';

export default function LaporanMasuk() {
    return (
        <AdminPage
            title="Laporan Masuk"
            description="Daftar laporan yang baru masuk dan perlu ditindaklanjuti"
            breadcrumbs={[{ title: 'Laporan Masuk', href: '/dashboard/admin/laporan-masuk' }]}
        />
    );
}
