interface BackTargetInput {
    from?: string | null;
    url: string;
    routePrefix: string;
}

export function resolveBackTarget({ from, url, routePrefix }: BackTargetInput) {
    if (from !== 'my-reports') {
        return { href: route(`${routePrefix}.incoming-reports.index`), label: 'Laporan Masuk' };
    }

    // kembali ke Laporan Saya dengan filter/pagination yang tadi dipakai
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    params.delete('origin');

    return {
        href: route(`${routePrefix}.my-reports.index`, Object.fromEntries(params.entries())),
        label: 'Laporan Saya',
    };
}
