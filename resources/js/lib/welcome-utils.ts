import { type StoredTicket } from '@/types/welcome';

export function getStoredTickets(): StoredTicket[] {
    try {
        return JSON.parse(localStorage.getItem('melati_tickets') ?? '[]') as StoredTicket[];
    } catch {
        return [];
    }
}

export function formatTicketDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
}
