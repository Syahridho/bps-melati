import { formatFullDate } from '@/lib/laporan-masuk-utils';
import { Clock } from 'lucide-react';
import { useId } from 'react';

interface CompletedStampProps {
    completedAt: string; // ISO string
}

export default function CompletedStamp({ completedAt }: CompletedStampProps) {
    // id unik untuk filter SVG (titik dua dari useId dibuang supaya aman dipakai di url(#...))
    const filterId = `stamp-rough-${useId().replace(/:/g, '')}`;

    return (
        // relative: jadi patokan posisi stempel. Tinggi baris hanya ditentukan oleh teks waktu.
        <div className="relative flex items-center px-4 py-2.5 sm:px-6">
            {/* Waktu selesai (kiri) */}
            <div className="flex min-w-0 items-center gap-2.5">
                <Clock className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 leading-tight">
                    <p className="text-muted-foreground text-xs">Waktu Selesai</p>
                    <p className="text-foreground truncate text-sm font-medium">{formatFullDate(completedAt)}</p>
                </div>
            </div>

            {/* Stempel (kanan): absolute, di tengah tinggi baris, ukuran besar sehingga keluar dari garis kotak */}
            <div className="pointer-events-none absolute top-1/2 right-4 z-10 -translate-y-1/2 select-none sm:right-10">
                {/* Wrapper dalam khusus animasi supaya tidak bentrok dengan translate di atas */}
                <div className="motion-safe:animate-[stamp-in_0.35s_ease-out]">
                    <svg
                        viewBox="-8 -8 216 96"
                        className="h-20 w-auto rotate-[10deg] overflow-visible stroke-red-600 opacity-90 sm:h-24 lg:h-28 dark:stroke-red-500"
                        fill="none"
                        role="img"
                        aria-label="Laporan selesai"
                    >
                        <defs>
                            {/* Efek cap: tepi sedikit bergelombang + bintik tinta */}
                            <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
                                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="warp" />
                                <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.5" result="rough" />
                                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
                                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -0.55" result="speckle" />
                                <feComposite in="rough" in2="speckle" operator="in" />
                            </filter>
                        </defs>

                        <g filter={`url(#${filterId})`}>
                            {/* Tepi ganda */}
                            <rect x="2" y="2" width="196" height="76" rx="12" strokeWidth="4" />
                            <rect x="9" y="9" width="182" height="62" rx="8" strokeWidth="2" />
                            {/* Teks */}
                            <text
                                x="100"
                                y="42"
                                dominantBaseline="middle"
                                textAnchor="middle"
                                fontSize="38"
                                fontWeight="900"
                                letterSpacing="3"
                                stroke="none"
                                className="fill-red-600 dark:fill-red-500"
                                style={{ fontFamily: "Impact, 'Arial Black', system-ui, sans-serif" }}
                            >
                                SELESAI
                            </text>
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}
