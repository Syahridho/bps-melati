import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Hand, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TicketClaimButtonProps {
    ticketId: number;
    disabled?: boolean;
}

export function TicketClaimButton({ ticketId, disabled = false }: TicketClaimButtonProps) {
    const [processing, setProcessing] = useState(false);

    const handleClaim = () => {
        router.post(
            route('dashboard.operator.incoming-reports.claim', { ticket: ticketId }),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    toast.success('Tiket berhasil diambil', {
                        description: 'Anda sekarang menjadi PIC laporan ini.',
                    });
                },
                onError: (errors) => {
                    toast.error('Tidak dapat mengambil tiket', {
                        description: Object.values(errors)[0] ?? 'Tiket mungkin sudah diambil operator lain.',
                    });
                },
            },
        );
    };

    return (
        <Button type="button" onClick={handleClaim} disabled={disabled || processing} className="gap-2">
            {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Hand className="size-4" />}
            Ambil Tiket
        </Button>
    );
}
