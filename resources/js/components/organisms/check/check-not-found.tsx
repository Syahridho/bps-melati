import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export function CheckNotFound({ ticketNumber }: { ticketNumber?: string }) {
    return (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive border">
            <CardContent className="flex items-start gap-4 p-6">
                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
                <div className="space-y-1">
                    <h3 className="text-base font-semibold">Tiket Tidak Ditemukan</h3>
                    <p className="text-sm opacity-90">
                        Nomor tiket <strong className="font-mono">{ticketNumber}</strong> tidak ditemukan di sistem. Harap periksa kembali penulisan
                        nomor tiket Anda.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
