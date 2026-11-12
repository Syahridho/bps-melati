import AppLogo from '@/components/layout/app-logo';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { AlertOctagon, FileQuestion, HardHat, Lock, LogOut, ServerCrash, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
Button;

interface ErrorPageProps {
    status: number;
    message?: string;
}

interface ErrorDetails {
    title: string;
    description: string;
    icon: LucideIcon;
    badgeText: string;
    image?: string;
}

export default function ErrorPage({ status = 404, message }: ErrorPageProps) {
    const [imageFailed, setImageFailed] = useState(false);

    const errorDetails = useMemo<ErrorDetails>(() => {
        switch (status) {
            case 404:
                return {
                    title: 'Halaman Tidak Ditemukan',
                    description: message || 'Maaf, halaman yang Anda cari tidak tersedia, telah dihapus, atau alamat URL yang Anda masukkan salah.',
                    icon: FileQuestion,
                    badgeText: '404 - Not Found',
                    image: '/error/404.webp',
                };
            case 403:
                return {
                    title: 'Akses Ditolak',
                    description: message || 'Anda tidak memiliki hak akses atau izin yang cukup untuk membuka halaman atau sumber daya ini.',
                    icon: Lock,
                    badgeText: '403 - Forbidden',
                    image: '/error/403.webp',
                };
            case 500:
                return {
                    title: 'Kesalahan Server',
                    description: 'Terjadi kendala internal pada sistem server kami. Tim teknis sedang menangani masalah ini.',
                    icon: ServerCrash,
                    badgeText: '500 - Internal Server Error',
                    image: '/error/500.webp',
                };
            case 505:
                return {
                    title: 'HTTP Version Not Supported',
                    description: 'Versi protokol HTTP yang digunakan oleh browser atau klien Anda tidak didukung oleh server kami.',
                    icon: AlertOctagon,
                    badgeText: '505 - HTTP Version Not Supported',
                    image: '/error/505.webp',
                };
            case 503:
                return {
                    title: 'Layanan Dalam Pemeliharaan',
                    description: 'Sistem Melati BPS sedang dalam pemeliharaan berkala. Silakan coba kembali beberapa saat lagi.',
                    icon: HardHat,
                    badgeText: '503 - Service Unavailable',
                    image: '/error/503.webp',
                };
            case 401:
                return {
                    title: 'Sesi Berakhir',
                    description: 'Sesi login Anda telah berakhir atau belum terautentikasi. Silakan masuk kembali ke akun Anda.',
                    icon: LogOut,
                    badgeText: '401 - Unauthorized',
                    image: '/error/404.webp',
                };
            case 405:
                return {
                    title: 'Metode Tidak Diizinkan',
                    description: 'Metode permintaan (HTTP Method) yang digunakan tidak diizinkan untuk halaman ini.',
                    icon: ShieldAlert,
                    badgeText: '405 - Method Not Allowed',
                    image: '/error/404.webp',
                };
            default:
                return {
                    title: `Terjadi Kesalahan (${status})`,
                    description: message || 'Maaf, terjadi kendala yang tidak terduga saat memproses permintaan Anda.',
                    icon: AlertOctagon,
                    badgeText: `HTTP ${status}`,
                    image: '/error/500.webp',
                };
        }
    }, [status, message]);

    const Icon = errorDetails.icon;

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className="via-background dark:via-background text-foreground relative flex h-dvh flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-blue-50/60 to-blue-100/40 px-4 py-6 font-sans dark:from-slate-950 dark:to-blue-950/30">
            <Head title={`${status} - ${errorDetails.title}`} />

            {/* Top Logo Bar */}
            <header className="flex w-full max-w-5xl shrink-0 items-center justify-between py-2">
                <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
                    <AppLogo />
                </Link>
            </header>

            {/* Main Content Card */}
            <main className="flex min-h-0 w-full max-w-xl flex-1 items-center justify-center">
                <div className="flex max-h-full min-h-0 flex-col items-center justify-center text-center">
                    {errorDetails.image && !imageFailed ? (
                        <img
                            src={errorDetails.image}
                            alt={errorDetails.title}
                            onError={() => setImageFailed(true)}
                            className="max-h-[calc(100dvh-14rem)] min-h-0 w-auto max-w-full object-contain"
                        />
                    ) : (
                        <div className="mb-4 flex size-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#005FB6] ring-8 ring-blue-500/10 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-500/20">
                            <Icon className="size-10 stroke-[1.75]" />
                        </div>
                    )}

                    <h1 className="text-foreground shrink-0 text-2xl font-extrabold tracking-tight sm:text-4xl">{errorDetails.title}</h1>
                </div>
            </main>

            {/* Footer */}
            <footer className="text-muted-foreground w-full max-w-5xl shrink-0 text-center text-xs">
                <p>&copy; {new Date().getFullYear()} Layanan Pengaduan & Informasi BPS - Melati. All rights reserved.</p>
            </footer>
        </div>
    );
}
