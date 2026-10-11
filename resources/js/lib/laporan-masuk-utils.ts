import { formatFileSize } from '@/lib/welcome-utils';
import { type Classification, type Status } from '@/types/laporan-masuk';

export { formatFileSize };

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

export function isImageMime(mimeType: string, fileName: string): boolean {
    return mimeType?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(fileName);
}

/**
 * Nama kanal publik (broadcast) untuk sebuah nomor tiket.
 *
 * Nomor tiket memuat `/` (mis. `L-1400/102026/EE18`) yang tidak diizinkan
 * protokol Pusher/Reverb pada nama kanal, sehingga harus dinormalisasi lebih dulu.
 * Harus selalu identik dengan `Ticket::publicChannelName()` di backend.
 */
export function ticketPublicChannel(ticketNumber: string): string {
    return `ticket.${ticketNumber.replace(/[^A-Za-z0-9_\-=,.@]/g, '-')}`;
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

export function classificationLabel(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
    }
}

export function classificationVariant(classification: Classification): 'default' | 'secondary' | 'destructive' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

export function statusLabel(status: Status): string {
    switch (status) {
        case 'baru':
            return 'Baru';
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        case 'selesai':
            return 'Selesai';
    }
}

export function statusVariant(status: Status): 'default' | 'secondary' | 'outline' {
    switch (status) {
        case 'baru':
            return 'default';
        case 'respon_awal':
            return 'secondary';
        case 'respon_substantif':
            return 'outline';
        case 'selesai':
            return 'outline';
    }
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
        return 'Kemarin';
    }
    if (diffDays < 7) {
        return `${diffDays} hari lalu`;
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
