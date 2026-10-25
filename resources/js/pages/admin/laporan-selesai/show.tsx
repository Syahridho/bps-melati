import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';
import { LaporanMasukDetailCard } from '@/components/laporan-masuk-detail-card';
import { LaporanMasukResponseHistory } from '@/components/laporan-masuk-response-history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AdminPage from '@/pages/admin/page';
import { type Attachment, type ShowProps, type TicketItem } from '@/types/laporan-selesai';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Flag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function DetailFlagButton({ ticket, routePrefix }: { ticket: TicketItem; routePrefix: string }) {
    const [flagged, setFlagged] = useState(ticket.is_flagged ?? false);
    const [note, setNote] = useState(ticket.flag_note ?? '');
    const [flagNote, setFlagNote] = useState(ticket.flag_note ?? '');
    const [flaggedByName, setFlaggedByName] = useState(ticket.flagged_by_name ?? '');
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const handleToggle = async () => {
        if (flagged) {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            setProcessing(true);
            try {
                const res = await fetch(route(`${routePrefix}.laporan-selesai.tandai`, ticket.ticket_number), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ aktif: false }),
                });
                if (!res.ok) throw new Error();
                toast.success('Tandai berhasil dilepas');
            } catch {
                setFlagged(true);
                setFlagNote(ticket.flag_note ?? '');
                setFlaggedByName(ticket.flagged_by_name ?? '');
                toast.error('Gagal melepas tandai');
            } finally {
                setProcessing(false);
            }
        } else {
            setOpen(true);
        }
    };

    const handleFlag = async () => {
        setFlagged(true);
        setFlagNote(note);
        setFlaggedByName(auth.user.name);
        setOpen(false);
        setProcessing(true);
        try {
            const res = await fetch(route(`${routePrefix}.laporan-selesai.tandai`, ticket.ticket_number), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ aktif: true, note: note || null }),
            });
            if (!res.ok) throw new Error();
            toast.success('Laporan berhasil ditandai');
        } catch {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            toast.error('Gagal menandai laporan');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {flagged && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                <Flag className="mr-1 size-3 fill-orange-500" />
                                Ditandai
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                            <p className="text-xs">
                                Ditandai oleh {flaggedByName || 'Petugas'}
                                {flagNote && <span className="block mt-1 text-muted-foreground">"{flagNote}"</span>}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={flagged ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={handleToggle}
                        disabled={processing}
                        aria-label={flagged ? 'Lepas tandai' : 'Tandai laporan'}
                    >
                        <Flag className={`mr-1.5 size-4 ${flagged ? 'fill-orange-500 text-orange-500' : ''}`} />
                        {flagged ? 'Lepas Tandai' : 'Tandai'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Tandai Laporan</p>
                        <Textarea
                            placeholder="Catatan alasan (opsional, maks 255 karakter)"
                            maxLength={255}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[60px] text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button size="sm" onClick={handleFlag} disabled={processing}>
                                Tandai
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default function Show() {
    const { auth, ticket } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const backRouteName = `${routePrefix}.laporan-selesai.index`;
    const backLabel = 'Laporan Selesai';

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);

    const handlePreviewAttachment = (attachment: Attachment, list: Attachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    const handlePreviewFile = (file: File, files: File[] = []) => {
        setPreviewItem(file);
        setPreviewList(files);
    };

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan selesai"
            breadcrumbs={[
                { title: backLabel, href: route(backRouteName) },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                    <DetailFlagButton ticket={ticket} routePrefix={routePrefix} />
                </div>

                <LaporanMasukDetailCard
                    ticket={ticket}
                    ticketStatus={ticket.status}
                    canEdit={false}
                    canDelete={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onPreviewAttachment={handlePreviewAttachment}
                />

                <LaporanMasukResponseHistory
                    responses={ticket.responses}
                    ticketId={ticket.id}
                    ticketStatus={ticket.status}
                    expectedVersion={ticket.version ?? 0}
                    routePrefix={routePrefix}
                    showReplyForm={false}
                    viewers={[]}
                    currentUserId={auth.user.id}
                    typingName={null}
                    pendingNotice={null}
                    conflict={null}
                    onDismissConflict={() => {}}
                    onToggleReply={() => {}}
                    onCancelReply={() => {}}
                    onReplySuccess={() => {}}
                    onPreviewAttachment={handlePreviewAttachment}
                    onPreviewFile={handlePreviewFile}
                    onTyping={() => {}}
                    highlightLast={false}
                />
            </div>

            <AttachmentPreviewDialog
                item={previewItem}
                items={previewList}
                onClose={() => {
                    setPreviewItem(null);
                    setPreviewList([]);
                }}
            />
        </AdminPage>
    );
}
