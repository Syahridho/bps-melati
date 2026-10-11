export function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isImageMime(mimeType: string, fileName: string): boolean {
    return mimeType?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(fileName);
}

export function isPdfMime(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

export function responseTypeLabel(type: string): string {
    switch (type) {
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        case 'balasan_pelapor':
            return 'Balasan Pelapor';
        default:
            return type;
    }
}

export function responseTypeVariant(type: string): 'default' | 'secondary' | 'outline' {
    if (type === 'balasan_pelapor') return 'outline';
    return type === 'respon_awal' ? 'secondary' : 'default';
}
