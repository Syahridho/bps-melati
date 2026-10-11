export function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isImageMime(mimeType?: string | null, name?: string): boolean {
    if (mimeType && mimeType.startsWith('image/')) return true;
    if (name) {
        const lower = name.toLowerCase();
        return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif');
    }
    return false;
}

export function isPdfMime(mimeType?: string | null, name?: string): boolean {
    if (mimeType === 'application/pdf') return true;
    if (name) return name.toLowerCase().endsWith('.pdf');
    return false;
}
