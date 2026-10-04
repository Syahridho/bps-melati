<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title') - {{ config('app.name', 'Melati BPS') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-gradient-to-b from-blue-50/60 via-background to-blue-100/40 dark:from-slate-950 dark:via-background dark:to-blue-950/30 font-sans text-foreground flex flex-col items-center justify-between px-4 py-8 relative overflow-x-hidden">
    <!-- Background Glows -->
    <div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"></div>
    <div className="pointer-events-none absolute right-10 bottom-10 -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"></div>

    <!-- Header -->
    <header class="w-full max-w-5xl flex items-center justify-between py-2">
        <a href="{{ url('/') }}" class="flex items-center gap-2">
            <div class="flex aspect-square size-8 items-center justify-center rounded-md">
                <img src="/logo-melati.webp" alt="Logo BPS Melati" class="h-full w-full object-contain" />
            </div>
            <div class="ml-1 grid flex-1 text-left text-sm">
                <img src="/desc-melati.webp" alt="Logo BPS" class="h-[34px] w-[88px]" />
            </div>
        </a>
    </header>

    <!-- Main Content -->
    <main class="my-auto w-full max-w-xl py-6">
        <div class="relative overflow-hidden rounded-2xl border border-blue-100 bg-card/95 p-6 sm:p-10 shadow-xl shadow-blue-900/5 backdrop-blur-sm dark:border-blue-900/50 dark:bg-card/90 text-center">
            <!-- Top Accent Line -->
            <div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-700"></div>

            <div class="mb-4 flex size-20 items-center justify-center rounded-2xl bg-blue-50 text-[#005FB6] ring-8 ring-blue-500/10 dark:bg-blue-950/60 dark:text-blue-400 mx-auto">
                <span class="text-3xl font-bold">@yield('code')</span>
            </div>

            <div class="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-[#005FB6] dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-300">
                HTTP @yield('code')
            </div>

            <h1 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                @yield('title')
            </h1>

            <p class="mt-3 text-sm text-muted-foreground sm:text-base leading-relaxed max-w-md mx-auto">
                @yield('message')
            </p>

            <div class="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                <a href="{{ url('/') }}" class="inline-flex items-center justify-center rounded-md bg-[#005FB6] hover:bg-[#004d96] text-white shadow-md shadow-blue-600/20 h-11 px-6 font-medium text-sm transition-colors">
                    <svg class="mr-2 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Ke Beranda
                </a>
                <button onclick="window.location.reload()" class="inline-flex items-center justify-center rounded-md border border-blue-200 text-[#005FB6] hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/60 h-11 px-5 font-medium text-sm transition-colors">
                    <svg class="mr-2 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    Muat Ulang
                </button>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="w-full max-w-5xl py-4 text-center text-xs text-muted-foreground">
        <p>&copy; {{ date('Y') }} Layanan Pengaduan & Informasi BPS - Melati. All rights reserved.</p>
    </footer>
</body>
</html>
