/**
 * Menghasilkan nama file export yang unik berdasarkan prefix, periode, dan waktu saat ini (YYYYMMDD_HHmmss).
 */
export function generateExportFilename(prefix: string, periode: string): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

    const sanitizedPeriode = periode
        .replace(/[/\\]+/g, '-')
        .replace(/[\s]+/g, '-')
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .replace(/-+/g, '-');

    return `${prefix}-${sanitizedPeriode}_${timestamp}`;
}

export function formatSemesterForFilename(semester: string): string {
    const parts = semester.split('-');
    if (parts.length === 2) {
        const year = parts[0];
        const roman = parts[1] === '1' ? 'I' : 'II';
        return `${roman}-${year}`;
    }
    return semester;
}
