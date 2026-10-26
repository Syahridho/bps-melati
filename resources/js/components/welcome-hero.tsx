export function WelcomeHero() {
    return (
        <div className="relative mx-auto mb-6 max-w-2xl space-y-3 text-center sm:mb-8">
            {/* soft radial halo crowning the heading (decorative) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-1/2 -z-10 h-40 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full [background-image:radial-gradient(closest-side,rgba(0,95,182,0.18),rgba(150,190,240,0.1)_60%,transparent_100%)] dark:[background-image:radial-gradient(closest-side,rgba(30,110,235,0.28),rgba(90,160,250,0.12)_60%,transparent_100%)]"
            />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sampaikan Laporan Anda</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
                Layanan pengaduan, aspirasi, dan permintaan informasi. Anda akan mendapat nomor tiket untuk memantau tindak lanjutnya.
            </p>
        </div>
    );
}
