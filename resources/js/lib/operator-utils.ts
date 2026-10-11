export function formatLastLogin(dateStr: string | null): string {
    if (!dateStr) return 'Belum pernah login';
    return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
