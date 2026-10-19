import Heading from '@/components/heading';

export default function SettingsLayout({
    title = 'Pengaturan',
    description = 'Kelola pengaturan aplikasi, batas waktu otomatis selesai, dan informasi penanda tangan rekap',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-4 py-6">
            <Heading title={title} description={description} />

            <div className="mt-6 max-w-2xl">
                <section className="space-y-6">{children}</section>
            </div>
        </div>
    );
}
