import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { ListChecks, Search, ShieldCheck, Ticket } from 'lucide-react';

const GUIDE_STEPS = [
    {
        icon: Ticket,
        title: 'Siapkan Kode Tiket',
        description: 'Kode tiket diterima setelah laporan terkirim. Simpan baik-baik.',
    },
    {
        icon: Search,
        title: 'Masukkan Kode',
        description: 'Ketik kode tiket pada kolom di atas lalu tekan Cek Status.',
    },
    {
        icon: ListChecks,
        title: 'Lihat Perkembangan',
        description: 'Lihat status terbaru dan balas tanggapan petugas jika diperlukan.',
    },
];

// const STATUS_ITEMS = [
//     { label: 'Diterima', icon: Inbox },
//     { label: 'Diproses', icon: Clock },
//     { label: 'Menunggu Tanggapan', icon: MessageCircle },
//     { label: 'Selesai', icon: CircleCheck },
// ];

export function CheckGuideSection() {
    return (
        <div className="space-y-12 md:space-y-16">
            {/* Section 1: Cara Cek Status Laporan */}
            <section aria-labelledby="cara-cek-title" className="space-y-6">
                <div className="mx-auto max-w-2xl space-y-2 text-center">
                    <h2 id="cara-cek-title" className="text-xl font-bold tracking-tight sm:text-2xl">
                        Cara Cek Status Laporan
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">Pantau perkembangan laporan Anda dalam 3 langkah mudah.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                    {GUIDE_STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <Card key={step.title} className="flex h-full flex-col p-6 shadow-sm transition-shadow hover:shadow-md">
                                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                                    <Icon className="size-5" aria-hidden="true" />
                                </div>
                                <div className="mt-4 flex-1 space-y-1.5">
                                    <h3 className="text-base font-semibold">{step.title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Section 2: Catatan Privasi / Keamanan */}
            <section aria-label="Informasi Keamanan" className="mx-auto max-w-3xl">
                <Alert className="border-primary/20 bg-primary/5">
                    <ShieldCheck className="text-primary size-5" aria-hidden="true" />
                    <div className="pl-2">
                        <AlertTitle className="text-sm font-semibold">Data Anda Aman</AlertTitle>
                        <AlertDescription className="text-muted-foreground text-xs sm:text-sm">
                            Hanya pemilik kode tiket yang dapat melihat laporan ini. Jangan bagikan kode tiket Anda kepada siapa pun.
                        </AlertDescription>
                    </div>
                </Alert>
            </section>
        </div>
    );
}
