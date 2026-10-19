import { type StoredTicket } from '@/types/welcome';
import { toast } from 'sonner';

export function warnJenisLaporan() {
    toast.warning("Pilih jenis laporan, lalu lengkapi detailnya.", {
        id: "pilih-jenis-laporan",
    });
}

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

/**
 * Tanggal hari ini dalam format YYYY-MM-DD memakai zona waktu lokal browser.
 *
 * Jangan pakai toISOString(): hasilnya berdasar UTC sehingga di WIB (UTC+7)
 * tanggal bisa mundur satu hari, dan nilai itu dipakai sebagai batas `max`
 * input tanggal.
 */
export function getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
}
