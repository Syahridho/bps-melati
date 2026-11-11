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

export interface AttachmentRejection {
    file: File;
    reason: string;
}

export interface ValidateAttachmentsOptions {
    existingFiles?: File[];
    maxFiles?: number;
    maxSizeMB?: number;
    accept?: string;
}

export function validateAttachments(
    newFiles: File[],
    options: ValidateAttachmentsOptions = {}
): { accepted: File[]; rejected: AttachmentRejection[] } {
    const {
        existingFiles = [],
        maxFiles = 3,
        maxSizeMB = 2,
        accept = '.pdf,.jpg,.jpeg,.png',
    } = options;

    const allowedExt = accept
        .split(',')
        .map((ext) => ext.trim().replace(/^\./, '').toLowerCase())
        .filter(Boolean);
    const maxBytes = maxSizeMB * 1024 * 1024;
    const accepted: File[] = [];
    const rejected: AttachmentRejection[] = [];
    const seen = new Set(
        existingFiles.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
    );

    for (const file of newFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const key = `${file.name}-${file.size}-${file.lastModified}`;

        if (seen.has(key)) {
            rejected.push({
                file,
                reason: `File "${file.name}" sudah ditambahkan.`,
            });
            continue;
        }

        if (!allowedExt.includes(ext)) {
            rejected.push({
                file,
                reason: `File "${file.name}" ditolak. Hanya format ${allowedExt
                    .join(', ')
                    .toUpperCase()} yang diizinkan.`,
            });
            continue;
        }

        if (file.size > maxBytes) {
            rejected.push({
                file,
                reason: `File "${file.name}" terlalu besar. Ukuran maksimal ${maxSizeMB}MB per file.`,
            });
            continue;
        }

        seen.add(key);
        accepted.push(file);
    }

    const remainingSlots = maxFiles - existingFiles.length;
    if (remainingSlots <= 0) {
        for (const file of accepted) {
            rejected.push({
                file,
                reason: `Maksimal ${maxFiles} file lampiran.`,
            });
        }
        return { accepted: [], rejected };
    }

    if (accepted.length > remainingSlots) {
        const overflow = accepted.slice(remainingSlots);
        for (const file of overflow) {
            rejected.push({
                file,
                reason: `Maksimal ${maxFiles} file lampiran.`,
            });
        }
        return { accepted: accepted.slice(0, remainingSlots), rejected };
    }

    return { accepted, rejected };
}
