import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

interface FooterLink {
    label: string;
    href: string;
}

interface LinkColumnProps {
    title: string;
    links: FooterLink[];
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

const TAUTAN_LAINNYA_LINKS: FooterLink[] = [
    { label: 'ASEAN Stats', href: 'https://www.aseanstats.org/' },
    { label: 'Reformasi Birokrasi', href: 'https://rb.bps.go.id/' },
    { label: 'Layanan Pengadaan Secara Elektronik', href: 'https://lpse.bps.go.id/' },
    { label: 'Politeknik Statistika STIS', href: 'https://stis.ac.id/' },
    { label: 'Pusdiklat BPS', href: 'https://pusdiklat.bps.go.id/' },
    { label: 'JDIH BPS', href: 'https://jdih.bps.go.id/public/' },
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

function LinkColumn({ title, links }: LinkColumnProps) {
    return (
        <nav aria-label={title} className="flex flex-col gap-3">
            <h3 className="text-footer-foreground text-sm font-semibold tracking-wide">{title}</h3>
            <ul className="flex flex-col gap-1">
                {links.map((link) => {
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
            </ul>
        </nav>
    );
}

interface BpsFooterProps {
    className?: string;
}

export function BpsFooter({ className }: BpsFooterProps) {
    return (
        <footer className={cn('bg-footer dark:bg-muted text-footer-muted border-footer-border mt-auto w-full border-t py-10 lg:py-12', className)}>
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-16">
                    {/* Kolom Kiri: Identitas & Alamat */}
                    <div className="flex w-full max-w-md flex-col items-start gap-4 sm:col-span-2 lg:col-span-1">
                        {/* Baris 1: Logo BPS + Teks dua baris */}
                        <LogoLockup src="/logo-bps.svg" alt="Logo BPS" imgClassName="w-14">
                            <span className="text-footer-accent text-lg leading-tight font-bold tracking-wide uppercase italic sm:text-xl">
                                BADAN PUSAT STATISTIK
                            </span>
                            <span className="text-footer-accent text-base leading-tight font-semibold tracking-wide uppercase italic sm:text-lg">
                                PROVINSI RIAU
                            </span>
                        </LogoLockup>

                        {/* Baris 2: Logo Melati + Teks dua baris */}
                        <LogoLockup src="/logo-melati.webp" alt="Logo Melati" imgClassName="w-10 rounded">
                            <span className="text-footer-accent text-lg leading-tight font-bold tracking-wider uppercase italic">MELATI</span>
                            <span className="text-footer-muted text-xs leading-snug sm:text-sm">
                                Manajemen Lapor, Aspirasi, dan Transparansi Informasi
                            </span>
                        </LogoLockup>

                        {/* Blok Alamat */}
                        <address className="text-footer-muted mt-2 space-y-0.5 text-sm leading-relaxed not-italic">
                            <p className="text-footer-foreground font-medium">Badan Pusat Statistik Provinsi Riau (Statistics of Riau Province)</p>
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

                    {/* Kolom Kanan: Tentang Kami */}
                    <div className="w-full lg:w-auto">
                        <LinkColumn title="Tentang Kami" links={TENTANG_KAMI_LINKS} />
                    </div>

                    {/* Kolom Kanan: Tautan Lainnya */}
                    <div className="w-full lg:w-auto">
                        <LinkColumn title="Tautan Lainnya" links={TAUTAN_LAINNYA_LINKS} />
                    </div>
                </div>

                {/* Garis Pemisah & Copyright di dalam container yang sama */}
                <div className="border-footer-border mt-10 border-t pt-6 text-center sm:text-left">
                    <p className="text-footer-muted text-xs sm:text-sm">©2026 Melati. All rights reserved. Power By BPS Provinsi Riau</p>
                </div>
            </div>
        </footer>
    );
}
