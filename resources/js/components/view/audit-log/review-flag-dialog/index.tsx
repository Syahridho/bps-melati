import { format } from 'date-fns';
import type { FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewGroup, Severity, Tingkat } from '@/types/audit-log';

interface ReviewFlagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: ReviewGroup | null;
    flagTypeLabels: Record<string, string>;
    status: string;
    onStatusChange: (status: string) => void;
    note: string;
    onNoteChange: (note: string) => void;
    error?: string | null;
    saving: boolean;
    onSubmit: (e: FormEvent) => void | Promise<void>;
}

const tingkatVariant: Record<Tingkat, 'destructive' | 'secondary' | 'default'> = {
    tinggi: 'destructive',
    sedang: 'secondary',
    rendah: 'default',
};

const severityVariant = (s: Severity) => (s === 'warning' ? 'destructive' : s === 'notice' ? 'secondary' : 'default');

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="text-right">{children}</dd>
        </div>
    );
}

export function ReviewFlagDialog({
    open,
    onOpenChange,
    group,
    flagTypeLabels,
    status,
    onStatusChange,
    note,
    onNoteChange,
    error,
    saving,
    onSubmit,
}: ReviewFlagDialogProps) {
    if (!group) return null;

    const details = group.representative.details;

    // Alasan sistem: catatan unik dari semua flag dalam grup
    const reasons = Array.from(new Set(group.flags.map((f) => f.details?.catatan).filter((c): c is string => Boolean(c))));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={onSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Tinjau Penanda</DialogTitle>
                        <DialogDescription>{group.ticket_number ?? 'Tanpa nomor tiket'}</DialogDescription>
                    </DialogHeader>

                    <dl className="bg-muted/30 space-y-1.5 rounded-md border p-3 text-sm">
                        <DetailRow label="Jenis">{group.types.map((t) => flagTypeLabels[t] ?? t).join(', ')}</DetailRow>
                        <DetailRow label="Tingkat">
                            <Badge variant={tingkatVariant[group.tingkat]} className="capitalize">
                                {group.tingkat}
                            </Badge>
                        </DetailRow>
                        <DetailRow label="Severity">
                            <Badge variant={severityVariant(group.severity)}>{group.severity}</Badge>
                        </DetailRow>
                        <DetailRow label="Petugas (PIC)">{details?.petugas_nama ?? 'N/A'}</DetailRow>
                        <DetailRow label="IP Pelapor">{details?.reporter_ip ?? 'N/A'}</DetailRow>
                        <DetailRow label="IP PIC">{details?.pic_ip ?? 'N/A'}</DetailRow>
                        <DetailRow label="Waktu dibuat">{format(new Date(group.created_at), 'dd MMM yyyy HH:mm')}</DetailRow>
                    </dl>

                    {reasons.length > 0 && (
                        <div className="space-y-1 text-xs">
                            <p className="font-medium">Alasan sistem:</p>
                            <ul className="text-muted-foreground list-disc space-y-0.5 pl-4">
                                {reasons.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label htmlFor="review-status" className="text-sm font-medium">
                            Status
                        </label>
                        <select
                            id="review-status"
                            value={status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="ditinjau">Ditinjau</option>
                            <option value="wajar">Wajar</option>
                            <option value="tindak_lanjut">Tindak Lanjut</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="review-note" className="text-sm font-medium">
                            Catatan admin
                        </label>
                        <Textarea id="review-note" value={note} onChange={(e) => onNoteChange(e.target.value)} rows={3} />
                    </div>

                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            {error}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
