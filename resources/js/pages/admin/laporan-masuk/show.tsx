import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AdminPage from '@/pages/admin/page';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Clock, Forward, Globe, Layers, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { useState } from 'react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'diproses' | 'selesai';

interface TicketDetail {
    id: number;
    ticket_number: string;
    period: string;
    sequence: number;
    classification: Classification;
    service_type: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_by_name: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    ticket: TicketDetail;
}

function classificationLabel(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
    }
}

function classificationVariant(classification: Classification): 'default' | 'secondary' | 'destructive' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

function statusLabel(status: Status): string {
    switch (status) {
        case 'baru':
            return 'Baru';
        case 'diproses':
            return 'Diproses';
        case 'selesai':
            return 'Selesai';
    }
}

function statusVariant(status: Status): 'default' | 'secondary' | 'outline' {
    switch (status) {
        case 'baru':
            return 'default';
        case 'diproses':
            return 'secondary';
        case 'selesai':
            return 'outline';
    }
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Show({ ticket }: ShowProps) {
    const [showForward, setShowForward] = useState(false);
    const [forwardMessage, setForwardMessage] = useState('');

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan"
            breadcrumbs={[
                { title: 'Laporan Masuk', href: route('dashboard.admin.laporan-masuk.index') },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
                {/* Back button & header */}
                <div className="flex items-center justify-between">
                    <Link
                        href={route('dashboard.admin.laporan-masuk.index')}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke Laporan Masuk
                    </Link>
                </div>

                {/* Main card */}
                <div className="rounded-lg border bg-card">
                    {/* Header */}
                    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{ticket.ticket_number}</h2>
                                <Badge variant={classificationVariant(ticket.classification)}>
                                    {classificationLabel(ticket.classification)}
                                </Badge>
                                <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="size-3.5" />
                                <span>Diterima {formatFullDate(ticket.created_at)}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowForward(!showForward)}>
                                <Forward className="mr-1.5 size-4" />
                                Forward
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Info pelapor & meta */}
                    <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <User className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pelapor</p>
                                <p className="text-sm font-medium">{ticket.reporter_name ?? 'Anonim'}</p>
                            </div>
                        </div>
                        {ticket.reporter_email && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Mail className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm font-medium">{ticket.reporter_email}</p>
                                </div>
                            </div>
                        )}
                        {ticket.reporter_wa && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Phone className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                                    <p className="text-sm font-medium">{ticket.reporter_wa}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Globe className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sumber</p>
                                <p className="text-sm font-medium capitalize">{ticket.source_app}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Layers className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Channel</p>
                                <p className="text-sm font-medium">{ticket.channel}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <Calendar className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Periode</p>
                                <p className="text-sm font-medium">{ticket.period}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <MessageSquare className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Nomor Urut</p>
                                <p className="text-sm font-medium">#{ticket.sequence}</p>
                            </div>
                        </div>
                        {ticket.completed_at && (
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2">
                                    <Clock className="size-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Selesai</p>
                                    <p className="text-sm font-medium">{formatFullDate(ticket.completed_at)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Isi laporan */}
                    <div className="px-6 py-5">
                        <h3 className="mb-3 text-sm font-semibold">Isi Laporan</h3>
                        <div className="prose prose-sm max-w-none rounded-lg bg-muted/50 p-4 dark:prose-invert">
                            <p className="whitespace-pre-wrap leading-relaxed">{ticket.content}</p>
                        </div>
                    </div>

                    {/* Forward section */}
                    {showForward && (
                        <>
                            <Separator />
                            <div className="px-6 py-5">
                                <h3 className="mb-3 text-sm font-semibold">Forward / Balas</h3>
                                <div className="space-y-3">
                                    <Textarea
                                        placeholder="Tulis pesan balasan atau catatan forward..."
                                        rows={4}
                                        value={forwardMessage}
                                        onChange={(e) => setForwardMessage(e.target.value)}
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setShowForward(false);
                                                setForwardMessage('');
                                            }}
                                        >
                                            Batal
                                        </Button>
                                        <Button size="sm" disabled={!forwardMessage.trim()}>
                                            <Send className="mr-1.5 size-4" />
                                            Kirim
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminPage>
    );
}
