import { Calendar, Clock, FileText, Globe, Layers, Mail, Phone, User } from 'lucide-react';

import { formatFullDate } from '@/lib/incoming-reports-utils';
import { formatDuration } from '@/lib/ticket-duration';
import type { TicketInfoGrid } from './ticket-info-grid';

interface InfoFieldsSource {
    reporter_name?: string | null;
    reporter_email?: string | null;
    reporter_wa?: string | null;
    source_app?: string | null;
    channel?: React.ReactNode;
    created_at: string;
    completed_at?: string | null;
    sequence?: React.ReactNode;
    created_by_name?: string | null;
    service_type?: string | null;
    satuan_tugas?: string | null;
}

interface InfoFieldsOptions {
    showDuration?: boolean;
    reporterLabel?: string;
    reporterFallback?: string;
    showServiceInfo?: boolean;
}

export function buildTicketInfoFields(d: InfoFieldsSource, options: InfoFieldsOptions = {}) {
    const { showDuration, reporterLabel = 'Pelapor', reporterFallback = 'Anonim', showServiceInfo } = options;

    return [
        { id: 'reporter', label: reporterLabel, value: d.reporter_name || reporterFallback, icon: User },
        d.reporter_email && {
            id: 'email',
            label: 'Email',
            value: d.reporter_email,
            icon: Mail,
            className: 'min-[1280px]:max-[1399px]:col-span-2',
        },
        d.reporter_wa && { id: 'wa', label: 'WhatsApp', value: d.reporter_wa, icon: Phone },
        { id: 'source', label: 'Sumber / Aplikasi', value: <span className="capitalize">{d.source_app}</span>, icon: Globe },
        { id: 'channel', label: 'Sumber Kanal', value: d.channel, icon: Layers },
        { id: 'created_at', label: 'Tanggal Dibuat', value: formatFullDate(d.created_at), icon: Calendar },
        showDuration &&
            d.completed_at && {
                id: 'duration',
                label: 'Durasi Penyelesaian',
                value: formatDuration(d.created_at, d.completed_at),
                icon: Clock,
            },
        { id: 'sequence', label: 'Nomor Urut', value: d.sequence, icon: FileText },
        d.created_by_name && { id: 'created_by', label: 'Dibuat Oleh', value: d.created_by_name, icon: User },
        showServiceInfo && d.service_type && { id: 'service_type', label: 'Jenis Layanan', value: d.service_type, icon: FileText },
        showServiceInfo && d.satuan_tugas && { id: 'satuan_tugas', label: 'Satuan Tugas', value: d.satuan_tugas, icon: Layers },
    ].filter(Boolean) as Parameters<typeof TicketInfoGrid>[0]['fields'];
}
