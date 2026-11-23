import { LoaderCircle } from 'lucide-react';

import { StarRatingInput } from '@/components/molecules/star-rating';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompleteForm } from '@/hooks/use-complete-form';

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
    const { accessCode, setAccessCode, rating, setRating, comment, setComment, persistAccessCode } = useCompleteForm(
        open,
        ticketNumber,
        defaultAccessCode,
    );

    const handleConfirm = () => {
        persistAccessCode();
        onConfirm(accessCode, rating, comment.trim() === '' ? null : comment.trim());
    };

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
                    </div>
                )}

                {error && <p className="text-destructive text-xs">{error}</p>}

                {ratingEnabled && (
                    <>
                        <div className="space-y-2 py-2">
                            <Label>Rating (opsional)</Label>
                            <StarRatingInput value={rating} onChange={setRating} />
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
                            <p className="text-muted-foreground text-right text-xs">
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
