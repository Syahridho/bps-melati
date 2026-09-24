import AdminPage from '@/pages/admin/page';

export default function InputData() {
    return (
        <AdminPage
            title="Input Data"
            description="Masukkan data laporan baru"
            breadcrumbs={[{ title: 'Input Data', href: '/dashboard/admin/input-data' }]}
        />
    );
}
