import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { classificationBadgeVariant, classificationLabel, statusConfig } from '@/lib/check-constants';
import { formatDateTime, isImageMime, isPdfMime } from '@/lib/check-utils';
import { formatFileSize } from '@/lib/welcome-utils';
import { type TicketDetail } from '@/types/check';
import { Calendar, Check, Copy, Download, FileText, Image as ImageIcon, Inbox, Paperclip, User } from 'lucide-react';

interface CheckTicketSummaryProps {
    ticket: TicketDetail;
    copied: boolean;
    onCopy: (text: string) => void;
}

export function CheckTicketSummary({ ticket, copied, onCopy }: CheckTicketSummaryProps) {
    const statusInfo = statusConfig(ticket.status);
    const StatusIcon = statusInfo.icon;

    return (
        <Card className="border shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Kode Tiket</span>
                            <Badge variant={classificationBadgeVariant(ticket.classification)}>{classificationLabel(ticket.classification)}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-bold sm:text-2xl">{ticket.ticket_number}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground h-8 w-8"
                                onClick={() => onCopy(ticket.ticket_number)}
                                title="Salin Kode Tiket"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusInfo.colorClass}`}
                        >
                            <StatusIcon className="h-4 w-4" />
                            <span>{statusInfo.label}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Metadata Grid */}
                <div className="bg-card grid grid-cols-1 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                        <div>
                            <p className="text-muted-foreground text-xs">Tanggal Pengajuan</p>
                            <p className="font-medium">{formatDateTime(ticket.created_at)}</p>
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-3">
                        <User className="text-muted-foreground h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Pelapor</p>
                            <p className="font-medium [overflow-wrap:anywhere] break-words">{ticket.reporter_name || 'Anonim'}</p>
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-3">
                        <Inbox className="text-muted-foreground h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Saluran Pengaduan</p>
                            <p className="font-medium [overflow-wrap:anywhere] break-words">{ticket.channel}</p>
                        </div>
                    </div>

                    {ticket.service_type && (
                        <div className="flex min-w-0 items-center gap-3 border-t pt-3 sm:col-span-2 lg:col-span-3">
                            <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs">Jenis Layanan / Satuan Tugas</p>
                                <p className="font-medium [overflow-wrap:anywhere] break-words">
                                    {ticket.service_type} {ticket.satuan_tugas ? `(${ticket.satuan_tugas})` : ''}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                {ticket.title && (
                    <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Judul Laporan</Label>
                        <h3 className="text-foreground text-base font-semibold [overflow-wrap:anywhere] break-words">{ticket.title}</h3>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Isi Laporan / Pesan Awal</Label>
                    <div className="bg-muted/20 rounded-lg border p-4 text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                        {ticket.content}
                    </div>
                </div>

                {/* Report Attachments */}
                {ticket.attachments.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Lampiran Pelapor</Label>
                        <div className="flex flex-wrap gap-2">
                            {ticket.attachments.map((att) => (
                                <a
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-card hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors"
                                >
                                    {isImageMime(att.mime_type, att.original_name) ? (
                                        <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                    ) : isPdfMime(att.mime_type, att.original_name) ? (
                                        <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                    ) : (
                                        <Paperclip className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span className="max-w-[200px] truncate">{att.original_name}</span>
                                    <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                                    <Download className="text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
