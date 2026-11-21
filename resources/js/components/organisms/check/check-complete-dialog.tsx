import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CheckCompleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    completing: boolean;
    ticketNumber?: string;
    defaultAccessCode?: string;
    onConfirm: (accessCode?: string, rating?: number | null, comment?: string | null) => void;
    error?: string;
    commentMaxLength?: number;
    ratingEnabled?: boolean;
}

const RATING_LABELS: Record<number, string> = {
    1: 'Sangat kurang',
    2: 'Kurang',
    3: 'Cukup',
    4: 'Baik',
    5: 'Sangat baik',
};

export function CheckCompleteDialog({
    open,
    onOpenChange,
    completing,
    ticketNumber,
    defaultAccessCode = '',
    onConfirm,
    error,
    commentMaxLength = 1000,
    ratingEnabled = true,
}: CheckCompleteDialogProps) {
    const [accessCode, setAccessCode] = useState(defaultAccessCode);
    const [rating, setRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (defaultAccessCode) {
            setAccessCode(defaultAccessCode);
        } else if (ticketNumber && typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem(`ticket_access_code_${ticketNumber}`) || '';
                if (stored) {
                    setAccessCode(stored);
                }
            } catch {
                //
            }
        }
    }, [defaultAccessCode, ticketNumber, open]);

    useEffect(() => {
        if (!open) {
            setRating(null);
            setHoverRating(null);
            setComment('');
        }
    }, [open]);

    const handleConfirm = () => {
        if (ticketNumber && accessCode && typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(`ticket_access_code_${ticketNumber}`, accessCode);
            } catch {
                //
            }
        }
        onConfirm(accessCode, rating, comment.trim() === '' ? null : comment.trim());
    };

    const activeRating = hoverRating ?? rating;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tandai Laporan Selesai?</DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin laporan ini telah selesai ditangani dan ingin menutupnya?{' '}
                        <span className="font-semibold">Tiket yang sudah ditutup tidak dapat dibalas kembali.</span>
                    </DialogDescription>
                </DialogHeader>

                {!defaultAccessCode && (
                    <div className="space-y-2 py-2">
                        <Label htmlFor="complete-access-code">
                            Kode Akses Tiket <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="complete-access-code"
                            type="text"
                            placeholder="Masukkan kode akses dari email laporan..."
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                            Masukkan kode akses yang diberikan saat laporan dibuat untuk memverifikasi hak penyelesaian laporan.
                        </p>
                        {error && <p className="text-destructive text-xs">{error}</p>}
                    </div>
                )}

                {ratingEnabled && (
                    <>
                <div className="space-y-2 py-2">
                    <Label>Rating (opsional)</Label>
                    <div
                        role="radiogroup"
                        aria-label="Rating 1 sampai 5"
                        className="flex items-center gap-1"
                        onMouseLeave={() => setHoverRating(null)}
                    >
                        {[1, 2, 3, 4, 5].map((value) => {
                            const filled = activeRating !== null && value <= activeRating;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={rating === value}
                                    aria-label={`${value} bintang${rating === value ? ', terpilih' : ''}`}
                                    className="rounded-sm p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => setRating((prev) => (prev === value ? null : value))}
                                    onMouseEnter={() => setHoverRating(value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setRating((prev) => (prev === value ? null : value));
                                        }
                                    }}
                                >
                                    <Star
                                        className={
                                            filled
                                                ? 'h-6 w-6 fill-amber-400 text-amber-400'
                                                : 'text-muted-foreground h-6 w-6'
                                        }
                                    />
                                </button>
                            );
                        })}
                    </div>
                    {activeRating !== null && (
                        <p className="text-muted-foreground text-xs">{RATING_LABELS[activeRating]}</p>
                    )}
                    <p className="text-muted-foreground text-xs">Klik bintang yang sama untuk mengosongkan rating.</p>
                </div>

                <div className="space-y-2 py-2">
                    <Label htmlFor="complete-comment">Komentar (opsional)</Label>
                    <Textarea
                        id="complete-comment"
                        placeholder="Tulis komentar Anda (opsional)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, commentMaxLength))}
                        rows={4}
                    />
                    <p className="text-muted-foreground text-xs text-right">
                        {comment.length}/{commentMaxLength}
                    </p>
                </div>
                    </>
                )}

                <DialogFooter className="mt-4 flex flex-row gap-2 sm:gap-0">
                    <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={completing}>
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={completing || (!defaultAccessCode && !accessCode.trim())}
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
                    >
                        {completing ? (
                            <>
                                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            'Ya, Tandai Selesai'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}