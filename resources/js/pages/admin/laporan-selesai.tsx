import AdminPage from '@/pages/admin/page';

export default function LaporanSelesai() {
    return (
        <AdminPage
            title="Laporan Selesai"
            description="Daftar laporan yang sudah selesai ditangani"
            breadcrumbs={[{ title: 'Laporan Selesai', href: '/dashboard/admin/laporan-selesai' }]}
        />
    );
}
