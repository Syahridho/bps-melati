import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    ArrowLeft,
    FileQuestion,
    HardHat,
    Home,
    Lock,
    LogOut,
    RotateCw,
    ServerCrash,
    ShieldAlert,
} from 'lucide-react';
import { useMemo } from 'react';

interface ErrorPageProps {
    status: number;
    message?: string;
}

export default function ErrorPage({ status = 404, message }: ErrorPageProps) {
    const errorDetails = useMemo(() => {
        switch (status) {
            case 404:
                return {
                    title: 'Halaman Tidak Ditemukan',
                    description:
                        'Maaf, halaman yang Anda cari tidak tersedia, telah dihapus, atau alamat URL yang Anda masukkan salah.',
                    icon: FileQuestion,
                    badgeText: '404 - Not Found',
                };
            case 403:
                return {
                    title: 'Akses Ditolak',
                    description:
                        'Anda tidak memiliki hak akses atau izin yang cukup untuk membuka halaman atau sumber daya ini.',
                    icon: Lock,
                    badgeText: '403 - Forbidden',
                };
            case 500:
                return {
                    title: 'Kesalahan Server',
                    description:
                        'Terjadi kendala internal pada sistem server kami. Tim teknis sedang menangani masalah ini.',
                    icon: ServerCrash,
                    badgeText: '500 - Internal Server Error',
                };
            case 505:
                return {
                    title: 'HTTP Version Not Supported',
                    description:
                        'Versi protokol HTTP yang digunakan oleh browser atau klien Anda tidak didukung oleh server kami.',
                    icon: AlertOctagon,
                    badgeText: '505 - HTTP Version Not Supported',
                };
            case 503:
                return {
                    title: 'Layanan Dalam Pemeliharaan',
                    description:
                        'Sistem Melati BPS sedang dalam pemeliharaan berkala. Silakan coba kembali beberapa saat lagi.',
                    icon: HardHat,
                    badgeText: '503 - Service Unavailable',
                };
            case 401:
                return {
                    title: 'Sesi Berakhir',
                    description:
                        'Sesi login Anda telah berakhir atau belum terautentikasi. Silakan masuk kembali ke akun Anda.',
                    icon: LogOut,
                    badgeText: '401 - Unauthorized',
                };
            case 405:
                return {
                    title: 'Metode Tidak Diizinkan',
                    description:
                        'Metode permintaan (HTTP Method) yang digunakan tidak diizinkan untuk halaman ini.',
                    icon: ShieldAlert,
                    badgeText: '405 - Method Not Allowed',
                };
            default:
                return {
                    title: `Terjadi Kesalahan (${status})`,
                    description:
                        message || 'Maaf, terjadi kendala yang tidak terduga saat memproses permintaan Anda.',
                    icon: AlertOctagon,
                    badgeText: `HTTP ${status}`,
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
        <div className="relative flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-blue-50/60 via-background to-blue-100/40 px-4 py-8 dark:from-slate-950 dark:via-background dark:to-blue-950/30 font-sans text-foreground">
            <Head title={`${status} - ${errorDetails.title}`} />

            {/* Decorative Blue Background Glows */}
            <div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/10" />
            <div className="pointer-events-none absolute right-10 bottom-10 -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />

            {/* Top Logo Bar */}
            <header className="w-full max-w-5xl flex items-center justify-between py-2">
                <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
                    <AppLogo />
                </Link>
            </header>

            {/* Main Content Card */}
            <main className="my-auto w-full max-w-xl py-6">
                <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-card/95 p-6 sm:p-10 shadow-xl shadow-blue-900/5 backdrop-blur-sm dark:border-blue-900/50 dark:bg-card/90">
                    {/* Top Accent Line */}
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-700" />

                    <div className="flex flex-col items-center text-center">
                        {/* Status Icon Container */}
                        <div className="mb-4 flex size-20 items-center justify-center rounded-2xl bg-blue-50 text-[#005FB6] ring-8 ring-blue-500/10 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-500/20">
                            <Icon className="size-10 stroke-[1.75]" />
                        </div>

                        {/* Status Badge */}
                        <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-[#005FB6] dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-300">
                            {errorDetails.badgeText}
                        </div>

                        {/* Large Status Number Outline Background Text */}
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                            {errorDetails.title}
                        </h1>

                        <p className="mt-3 text-sm text-muted-foreground sm:text-base leading-relaxed max-w-md">
                            {errorDetails.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                            <Button
                                asChild
                                className="bg-[#005FB6] hover:bg-[#004d96] text-white shadow-md shadow-blue-600/20 h-11 px-6 font-medium"
                            >
                                <Link href="/">
                                    <Home className="mr-2 size-4" />
                                    Ke Beranda
                                </Link>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleReload}
                                className="border-blue-200 text-[#005FB6] hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/60 h-11 px-5"
                            >
                                <RotateCw className="mr-2 size-4" />
                                Muat Ulang
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleGoBack}
                                className="text-muted-foreground hover:text-foreground h-11 px-4"
                            >
                                <ArrowLeft className="mr-1.5 size-4" />
                                Kembali
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-5xl py-4 text-center text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Layanan Pengaduan & Informasi BPS - Melati. All rights reserved.</p>
            </footer>
        </div>
    );
}
