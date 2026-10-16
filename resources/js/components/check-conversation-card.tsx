import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { responseTypeLabel } from '@/lib/check-constants';
import { formatDateTime, isImageFile, isImageMime, isPdfMime } from '@/lib/check-utils';
import { formatFileSize } from '@/lib/welcome-utils';
import { type TicketDetail } from '@/types/check';
import {
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    MessageSquare,
    Paperclip,
    Send,
    TimerOff,
    User,
    X,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, type RefObject } from 'react';

interface ReplyFormData {
    message: string;
    attachments: File[];
}

interface CheckConversationCardProps {
    ticket: TicketDetail;
    completing: boolean;
    onOpenCompleteDialog: () => void;
    showReplyForm: boolean;
    onOpenReplyForm: () => void;
    onCloseReplyForm: () => void;
    replyData: ReplyFormData;
    setReplyData: <K extends keyof ReplyFormData>(key: K, value: ReplyFormData[K]) => void;
    replyProcessing: boolean;
    replyErrors: Partial<Record<keyof ReplyFormData, string>>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onSubmitReply: (e: FormEvent) => void;
}

export function CheckConversationCard({
    ticket,
    completing,
    onOpenCompleteDialog,
    showReplyForm,
    onOpenReplyForm,
    onCloseReplyForm,
    replyData,
    setReplyData,
    replyProcessing,
    replyErrors,
    fileInputRef,
    onFileChange,
    onRemoveFile,
    onSubmitReply,
}: CheckConversationCardProps) {
    return (
        <Card className="border shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="text-primary h-5 w-5" />
                        <CardTitle className="text-lg font-bold">Diskusi & Tanggapan Petugas</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{ticket.responses.length} Tanggapan</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {ticket.responses.length === 0 ? (
                    <div className="text-muted-foreground space-y-2 py-8 text-center">
                        <Clock className="mx-auto h-10 w-10 opacity-40" />
                        <p className="font-medium">Belum Ada Tanggapan</p>
                        <p className="mx-auto max-w-md text-xs opacity-80">
                            Laporan Anda telah diterima dan sedang diproses oleh tim kami. Tanggapan akan ditampilkan di halaman ini setelah
                            ditanggapi oleh petugas.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {ticket.responses.map((res) => {
                            const isSystem = res.is_system === true;
                            const isReporter = isSystem || res.is_reporter || res.type === 'balasan_pelapor';
                            return (
                                <div
                                    key={res.id}
                                    className={`relative border-l-2 pb-6 pl-6 ${
                                        isSystem
                                            ? 'border-muted-foreground/40 border-dashed'
                                            : isReporter
                                              ? 'border-blue-500/30'
                                              : 'border-primary/30'
                                    } last:border-l-0 last:pb-0`}
                                >
                                    <span
                                        className={`absolute top-0 -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${
                                            isSystem ? 'bg-muted-foreground' : isReporter ? 'bg-blue-600' : 'bg-primary'
                                        } ring-background ring-4`}
                                    >
                                        {isSystem ? (
                                            <TimerOff className="h-2.5 w-2.5 text-white" />
                                        ) : isReporter ? (
                                            <User className="h-2.5 w-2.5 text-white" />
                                        ) : (
                                            <CheckCircle2 className="text-primary-foreground h-3 w-3" />
                                        )}
                                    </span>

                                    <div
                                        className={`space-y-3 rounded-lg border p-4 shadow-xs ${
                                            isSystem
                                                ? 'bg-muted/40 border-dashed'
                                                : isReporter
                                                  ? 'border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20'
                                                  : 'bg-card'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={isReporter ? 'secondary' : res.type === 'respon_substantif' ? 'default' : 'outline'}
                                                    className="text-[11px]"
                                                >
                                                    {isSystem ? 'Otomatis' : responseTypeLabel(res.type)}
                                                </Badge>
                                                {/* {res.user_name !== 'Operator' && res.user_name !== 'Admin' && (
                                                    <span className="text-xs font-semibold">{res.user_name}</span>
                                                )} */}
                                            </div>
                                            <span className="text-muted-foreground text-xs">
                                                {res.sent_at ? formatDateTime(res.sent_at) : formatDateTime(res.created_at)}
                                            </span>
                                        </div>

                                        <div
                                            className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                                isSystem ? 'text-muted-foreground italic' : 'text-foreground'
                                            }`}
                                        >
                                            {res.message}
                                        </div>

                                        {res.attachments.length > 0 && (
                                            <div className="space-y-1.5 border-t pt-2">
                                                <span className="text-muted-foreground text-xs font-medium">Lampiran:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {res.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-muted/50 hover:bg-accent inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
                                                        >
                                                            {isImageMime(att.mime_type, att.original_name) ? (
                                                                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                            ) : isPdfMime(att.mime_type, att.original_name) ? (
                                                                <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                                            ) : (
                                                                <Paperclip className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                            )}
                                                            <span className="max-w-[180px] truncate">{att.original_name}</span>
                                                            {att.size ? (
                                                                <span className="text-muted-foreground text-[10px]">
                                                                    ({formatFileSize(att.size)})
                                                                </span>
                                                            ) : null}
                                                            <Download className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Auto Close Notice */}
                {ticket.status !== 'selesai' && ticket.auto_close_at && (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-xs">
                        <TimerOff className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-muted-foreground">
                            Laporan akan ditutup otomatis bila tidak ada balasan dari Anda sebelum{' '}
                            <span className="text-foreground font-medium">{formatDateTime(ticket.auto_close_at)}</span>.
                        </p>
                    </div>
                )}

                {ticket.status === 'selesai' && ticket.closed_reason === 'auto_close' && (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-xs">
                        <TimerOff className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-muted-foreground">Laporan ini telah ditutup otomatis karena tidak ada balasan dari Anda.</p>
                    </div>
                )}

                {/* Action Area for Reporter when ticket is active */}
                {ticket.status !== 'selesai' && (
                    <div className="space-y-4 border-t pt-6">
                        {!showReplyForm ? (
                            <div className="bg-muted/30 flex flex-col items-center justify-between gap-3 rounded-lg border p-4 sm:flex-row">
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    Ada yang ingin ditanyakan lagi atau perlu tanggapan tambahan?
                                </p>
                                <div className="flex w-full items-center gap-2 sm:w-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onOpenCompleteDialog}
                                        disabled={completing}
                                        className="flex-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 sm:flex-initial dark:text-emerald-400"
                                    >
                                        {completing ? (
                                            <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                        )}
                                        Selesai
                                    </Button>
                                    <Button type="button" size="sm" onClick={onOpenReplyForm} className="flex-1 sm:flex-initial">
                                        <Send className="mr-1.5 h-4 w-4" />
                                        Balas Laporan
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={onSubmitReply} className="bg-card space-y-4 rounded-lg border p-4 shadow-xs">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                                        <Send className="text-primary h-4 w-4" />
                                        Kirim Balasan Pelapor
                                    </h4>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={onCloseReplyForm}
                                        className="text-muted-foreground h-7 w-7 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reply-message">
                                        Pesan Balasan <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="reply-message"
                                        placeholder="Tulis balasan atau penjelasan tambahan Anda untuk petugas BPS..."
                                        rows={3}
                                        value={replyData.message}
                                        onChange={(e) => setReplyData('message', e.target.value)}
                                        required
                                    />
                                    {replyErrors.message && <p className="text-destructive text-xs">{replyErrors.message}</p>}
                                </div>

                                {/* File Upload */}
                                <div className="space-y-2">
                                    <Label>Lampiran Balasan (opsional)</Label>
                                    <p className="text-muted-foreground text-xs">Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file.</p>

                                    {replyData.attachments.length < 3 && (
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                multiple
                                                onChange={onFileChange}
                                                className="hidden"
                                            />
                                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                                <Paperclip className="mr-2 h-4 w-4" />
                                                Pilih File Lampiran
                                            </Button>
                                        </div>
                                    )}

                                    {replyData.attachments.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            {replyData.attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                                                    <div className="flex items-center gap-2 truncate">
                                                        {isImageFile(file) ? (
                                                            <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                                        ) : (
                                                            <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                        )}
                                                        <span className="truncate font-medium">{file.name}</span>
                                                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive h-6 w-6"
                                                        onClick={() => onRemoveFile(index)}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t pt-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={onCloseReplyForm}>
                                        Batal
                                    </Button>
                                    <Button type="submit" size="sm" disabled={replyProcessing || !replyData.message.trim()}>
                                        {replyProcessing ? (
                                            <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="mr-1.5 h-4 w-4" />
                                        )}
                                        Kirim Balasan
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
