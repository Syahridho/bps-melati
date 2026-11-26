import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Download, Smartphone } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface FooterLink {
    label: string;
    href: string;
}

interface LogoLockupProps {
    src: string;
    alt: string;
    imgClassName: string;
    children: ReactNode;
}

const TENTANG_KAMI_LINKS: FooterLink[] = [
    { label: 'Profil BPS', href: 'https://ppid.bps.go.id/app/konten/1400/Profil-BPS.html' },
    { label: 'PPID', href: 'https://ppid.bps.go.id/?mfd=1400' },
    { label: 'Kebijakan Diseminasi', href: 'https://ppid.bps.go.id/app/konten/0000/Layanan-BPS.html#pills-3' },
    { label: 'Masuk', href: '/login' },
];

function LogoLockup({ src, alt, imgClassName, children }: LogoLockupProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-12 w-14 shrink-0 items-center justify-start">
                <img src={src} alt={alt} className={cn('h-auto max-h-12 w-auto max-w-14 object-contain object-left', imgClassName)} />
            </div>
            <div className="flex flex-col justify-center">{children}</div>
        </div>
    );
}

interface AndroidReleaseMeta {
    available: boolean;
    version: string;
    size_bytes: number;
    released_at: string | null;
    release_notes: string | null;
    checksum_sha256: string;
}

interface BpsFooterProps {
    className?: string;
    androidRelease?: AndroidReleaseMeta | null;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FooterSection({ className, androidRelease }: BpsFooterProps) {
    const [open, setOpen] = useState(false);
    const available = !!androidRelease?.available;
    return (
        <>
            <footer
                className={cn('bg-footer dark:bg-muted text-footer-muted border-footer-border mt-auto w-full border-t py-10 lg:py-12', className)}
            >
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                    <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                        {/* Kolom Kiri: Identitas & Alamat */}
                        <div className="flex w-full max-w-md flex-col items-start gap-4">
                            {/* Baris 1: Logo BPS + Teks dua baris */}
                            <LogoLockup src="/logo-bps.svg" alt="Logo BPS" imgClassName="w-14">
                                <span className="text-footer-accent text-lg leading-tight font-bold tracking-wide uppercase italic sm:text-xl">
                                    BADAN PUSAT STATISTIK
                                </span>
                                <span className="text-footer-accent text-base leading-tight font-semibold tracking-wide uppercase italic sm:text-lg">
                                    PROVINSI RIAU
                                </span>
                            </LogoLockup>

                            {/* Blok Alamat */}
                            <address className="text-footer-muted mt-2 space-y-0.5 text-sm leading-relaxed not-italic">
                                <p className="text-footer-foreground font-medium">
                                    Badan Pusat Statistik Provinsi Riau (Statistics of Riau Province)
                                </p>
                                <p>Jl. Pattimura No. 12 Pekanbaru - Riau</p>
                                <p>Indonesia</p>
                                <p>Telp (62-761) 23042</p>
                                <p>Faks (62-761) 21336</p>
                                <p>
                                    Mailbox :{' '}
                                    <a
                                        href="mailto:riau@bps.go.id"
                                        className="text-footer-accent focus-visible:ring-ring/50 rounded-sm font-medium outline-none hover:underline focus-visible:ring-[3px]"
                                    >
                                        riau@bps.go.id
                                    </a>
                                </p>
                            </address>
                        </div>

                        {/* Kolom Kanan (Logo Melati di atas Tentang Kami, menumpuk vertikal) */}
                        <div className="flex flex-col gap-6">
                            <div className="flex w-full max-w-sm flex-col items-start">
                                <LogoLockup src="/logo-melati.webp" alt="Logo Melati" imgClassName="w-10 rounded">
                                    <span className="text-footer-accent text-lg leading-tight font-bold tracking-wider uppercase italic">MELATI</span>
                                    <span className="text-footer-muted text-xs leading-snug whitespace-nowrap sm:text-sm">
                                        Manajemen Lapor, Aspirasi, dan Transparansi Informasi
                                    </span>
                                </LogoLockup>
                            </div>

                            <div className="w-full lg:w-auto">
                                <nav aria-label="Tentang Kami" className="flex flex-col gap-3">
                                    <h3 className="text-footer-foreground text-sm font-semibold tracking-wide">Tentang Kami</h3>
                                    <ul className="flex flex-col gap-1">
                                        {TENTANG_KAMI_LINKS.filter((l) => l.label !== 'Masuk').map((link) => {
                                            const isInternal = link.href.startsWith('/');
                                            return (
                                                <li key={link.href}>
                                                    {isInternal ? (
                                                        <Link
                                                            href={link.href}
                                                            className="text-footer-muted hover:text-footer-accent focus-visible:ring-ring/50 inline-block rounded-sm py-1 text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-[3px]"
                                                        >
                                                            {link.label}
                                                        </Link>
                                                    ) : (
                                                        <a
                                                            href={link.href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-footer-muted hover:text-footer-accent focus-visible:ring-ring/50 inline-block rounded-sm py-1 text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-[3px]"
                                                        >
                                                            {link.label}
                                                        </a>
                                                    )}
                                                </li>
                                            );
                                        })}

                                        <li className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href="/login"
                                                className="text-footer-muted hover:text-footer-accent focus-visible:ring-ring/50 inline-block rounded-sm py-1 text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-[3px]"
                                            >
                                                Masuk
                                            </Link>
                                        </li>
                                        <li>
                                            {available && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-xs"
                                                    onClick={() => setOpen(true)}
                                                >
                                                    <Smartphone className="h-3.5 w-3.5" />
                                                    Unduh Android
                                                </Button>
                                            )}
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Garis Pemisah & Copyright di dalam container yang sama */}
                    <div className="border-footer-border mt-10 border-t pt-6 text-center sm:text-left">
                        <p className="text-footer-muted text-xs sm:text-sm">©2026 Melati. All rights reserved. Power By BPS Provinsi Riau</p>
                    </div>
                </div>
            </footer>

            {available && androidRelease && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Unduh Aplikasi Melati untuk Android</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="font-medium">Versi : {androidRelease.release_notes && androidRelease.release_notes}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Ukuran:</span>{' '}
                                    <span className="font-medium">{formatBytes(androidRelease.size_bytes)}</span>
                                </div>
                            </div>

                            <div className="text-muted-foreground space-y-1 text-xs">
                                <p className="font-medium">Cara pasang:</p>
                                <ol className="list-decimal space-y-0.5 pl-4">
                                    <li>Unduh APK.</li>
                                    <li>Buka file.</li>
                                    <li>Izinkan “Pasang dari sumber tidak dikenal” bila diminta.</li>
                                    <li>Pasang.</li>
                                </ol>
                            </div>
                            <Button asChild className="w-full">
                                <a href={route('android.download')} download>
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh APK
                                </a>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
