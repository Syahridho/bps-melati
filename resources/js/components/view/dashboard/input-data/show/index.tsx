import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/shared/attachment-preview-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import AdminPage from '@/layouts/dashboard/page';
import {
    type InputDataAttachment,
    type InputDataResponseItem,
    type InputDataShowProps,
    type InputDataTicketDetail,
    type StatusType,
} from '@/types/input-data';
import { type TicketResponseItem } from '@/types/laporan-masuk';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Flag } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

function InputDataDetailFlagButton({ ticket, routePrefix }: { ticket: InputDataTicketDetail; routePrefix: string }) {
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
                const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
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
            const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
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
                                {flagNote && <span className="text-muted-foreground mt-1 block">"{flagNote}"</span>}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {flagged ? (
                <Button variant="secondary" size="sm" onClick={handleToggle} disabled={processing} aria-label="Lepas tandai">
                    <Flag className="mr-1.5 size-4 fill-orange-500 text-orange-500" />
                    Lepas Tandai
                </Button>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={processing} aria-label="Tandai laporan">
                            <Flag className="mr-1.5 size-4" />
                            Tandai
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
            )}
        </div>
    );
}

export default function ShowInputDataView() {
    const { auth, ticket, can, flash } = usePage<InputDataShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
    const backRouteName = `${routePrefix}.input-data.index`;
    const backLabel = 'Input Data';

    const canEdit = can?.edit ?? true;
    const canDelete = can?.delete ?? true;

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [responses, setResponses] = useState<InputDataResponseItem[]>(ticket.responses);
    const [ticketStatus, setTicketStatus] = useState<StatusType>(ticket.status);
    const [ticketVersion, setTicketVersion] = useState<number>(ticket.version ?? 0);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const editForm = useForm({
        reporter_name: ticket.reporter_name ?? '',
        reporter_email: ticket.reporter_email ?? '',
        reporter_wa: ticket.reporter_wa ?? '',
        title: ticket.title ?? '',
        content: ticket.content ?? '',
    });

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        setResponses(ticket.responses);
        setTicketStatus(ticket.status);
        setTicketVersion(ticket.version ?? 0);
    }, [ticket]);

    useEffect(() => {
        const hasPendingEmail = responses.some((r) => r.email_status === 'pending');
        if (!hasPendingEmail) {
            return;
        }

        const startTime = Date.now();
        const maxDuration = 2 * 60 * 1000;

        const interval = setInterval(() => {
            if (Date.now() - startTime >= maxDuration) {
                clearInterval(interval);
                return;
            }

            const stillPending = responses.some((r) => r.email_status === 'pending');
            if (!stillPending) {
                clearInterval(interval);
                return;
            }

            router.reload({
                only: ['ticket'],
            });
        }, 4000);

        return () => {
            clearInterval(interval);
        };
    }, [responses]);

    const handleIncomingResponse = useCallback((response: TicketResponseItem) => {
        const mappedResponse: InputDataResponseItem = {
            id: response.id,
            type: response.type,
            message: response.message,
            user_name: response.user_name,
            is_reporter: response.is_reporter,
            is_system: response.is_system,
            sent_at: response.sent_at,
            created_at: response.created_at,
            email_status: response.email_status,
            email_sent_at: response.email_sent_at,
            email_failed_at: response.email_failed_at,
            email_error: response.email_error,
            attachments: response.attachments.map((att) => ({
                id: att.id,
                original_name: att.original_name,
                mime_type: att.mime_type,
                size: att.size,
                url: att.url,
            })),
        };

        setResponses((prev) => {
            if (prev.some((r) => r.id === mappedResponse.id)) {
                return prev;
            }
            return [...prev, mappedResponse];
        });
    }, []);

    useTicketRealtime({
        ticketId: ticket.id,
        currentUserId: auth.user.id,
        initialVersion: ticketVersion,
        currentUserName: auth.user.name,
        onResponse: handleIncomingResponse,
        onEmailStatusUpdate: (event) => {
            setResponses((prev) =>
                prev.map((r) =>
                    r.id === event.response_id
                        ? {
                              ...r,
                              email_status: event.email_status as InputDataResponseItem['email_status'],
                              email_sent_at: event.email_sent_at ?? null,
                              email_failed_at: event.email_failed_at ?? null,
                              email_error: event.email_error ?? null,
                          }
                        : r,
                ),
            );
        },
        onStatusChange: (status, version) => {
            setTicketStatus(status as StatusType);
            setTicketVersion((prev) => Math.max(prev, version));
        },
        onCompleted: () => {
            setSuccessMessage('Pelapor menandai laporan ini selesai.');
            toast.info('Pelapor menyelesaikan laporan ini', {
                description: 'Status berubah menjadi Selesai.',
            });
        },
    });

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        editForm.put(route(`${routePrefix}.laporan-masuk.update`, { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditOpen(false);
                toast.success('Data berhasil diperbarui', {
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui data', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    const handleDeleteSubmit = () => {
        setIsDeleting(true);
        router.delete(route(`${routePrefix}.laporan-masuk.destroy`, { ticketNumber: ticket.ticket_number }), {
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                toast.success('Data berhasil dihapus');
            },
            onError: () => {
                toast.error('Gagal menghapus data');
            },
        });
    };

    const handlePreviewAttachment = (attachment: InputDataAttachment, list: InputDataAttachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    return (
        <AdminPage
            breadcrumbs={[
                { title: backLabel, href: route(backRouteName) },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <Head title={`Detail Input Data - ${ticket.ticket_number}`} />
            <div className="space-y-6">
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Link
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                    <InputDataDetailFlagButton ticket={ticket} routePrefix={routePrefix} />
                </div>

                <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight">{ticket.ticket_number}</h1>
                                <Badge variant="secondary" className="capitalize">
                                    {ticket.classification.replace('_', ' ')}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={
                                        ticketStatus === 'selesai'
                                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                            : 'border-blue-500/40 text-blue-600 dark:text-blue-400'
                                    }
                                >
                                    {ticketStatus.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Diinput {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                                {ticket.created_by_name && ` oleh ${ticket.created_by_name}`} · Kanal: {ticket.channel}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                                    Edit
                                </Button>
                            )}
                            {canDelete && (
                                <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
                                    Hapus
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <span className="text-muted-foreground block text-xs">Nama Pelapor / Sumber</span>
                            <span className="text-sm font-medium">{ticket.reporter_name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs">Email Pelapor</span>
                            <span className="text-sm font-medium">{ticket.reporter_email || '-'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs">Nomor WhatsApp</span>
                            <span className="text-sm font-medium">{ticket.reporter_wa || '-'}</span>
                        </div>
                        {ticket.service_type && (
                            <div>
                                <span className="text-muted-foreground block text-xs">Jenis Layanan</span>
                                <span className="text-sm font-medium">{ticket.service_type}</span>
                            </div>
                        )}
                        {ticket.satuan_tugas && (
                            <div>
                                <span className="text-muted-foreground block text-xs">Satuan Tugas</span>
                                <span className="text-sm font-medium">{ticket.satuan_tugas}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 border-t pt-4">
                        <span className="text-muted-foreground block text-xs">Isi Laporan / Catatan</span>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{ticket.content}</p>
                    </div>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                            <span className="text-muted-foreground block text-xs mb-2">Lampiran ({ticket.attachments.length})</span>
                            <div className="flex flex-wrap gap-2">
                                {ticket.attachments.map((att) => (
                                    <button
                                        key={att.id}
                                        type="button"
                                        onClick={() => handlePreviewAttachment(att, ticket.attachments)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                                    >
                                        <span className="truncate max-w-[200px]">{att.original_name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm space-y-4">
                    <h2 className="text-base font-semibold">Riwayat Tindak Lanjut & Balasan</h2>

                    {responses.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4 text-center">Belum ada riwayat tindak lanjut.</p>
                    ) : (
                        <div className="space-y-4">
                            {responses.map((resp) => (
                                <div key={resp.id} className="rounded-lg border p-4 bg-muted/20 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">{resp.user_name}</span>
                                        <span>{resp.sent_at ? new Date(resp.sent_at).toLocaleString('id-ID') : '-'}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-line">{resp.message}</p>
                                    {resp.attachments && resp.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {resp.attachments.map((att) => (
                                                <button
                                                    key={att.id}
                                                    type="button"
                                                    onClick={() => handlePreviewAttachment(att, resp.attachments)}
                                                    className="inline-flex items-center gap-1.5 rounded border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                                                >
                                                    <span className="truncate max-w-[180px]">{att.original_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Tiket Input Data</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-medium">Judul</label>
                            <input
                                type="text"
                                value={editForm.data.title}
                                onChange={(e) => editForm.setData('title', e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium">Nama Pelapor</label>
                            <input
                                type="text"
                                value={editForm.data.reporter_name}
                                onChange={(e) => editForm.setData('reporter_name', e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium">Email</label>
                                <input
                                    type="email"
                                    value={editForm.data.reporter_email}
                                    onChange={(e) => editForm.setData('reporter_email', e.target.value)}
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium">WhatsApp</label>
                                <input
                                    type="text"
                                    value={editForm.data.reporter_wa}
                                    onChange={(e) => editForm.setData('reporter_wa', e.target.value)}
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium">Isi Laporan</label>
                            <Textarea
                                value={editForm.data.content}
                                onChange={(e) => editForm.setData('content', e.target.value)}
                                className="mt-1 min-h-[100px] text-sm"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Tiket Input Data</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus tiket <strong>{ticket.ticket_number}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Batal
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteSubmit} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
