import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LoaderCircle, Monitor, Wifi } from 'lucide-react';

/** Bentuk data yang dikirim backend saat login diblokir (App\Exceptions\AccountInUseException). */
export interface SessionConflictInfo {
    device: string;
    last_active: string;
    last_active_iso: string | null;
    ip: string | null;
}

interface SessionConflictCardProps {
    conflict: SessionConflictInfo;
    processing: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Kartu konfirmasi, bukan sekadar pesan error: menjelaskan sesi mana yang
 * masih aktif lalu menawarkan ambil alih.
 *
 * Alamat IP selalu arrives dalam bentuk tersamar dari backend
 * (App\Support\IpMasker) — komponen ini tidak pernah menampilkan IP mentah.
 */
export function SessionConflictCard({ conflict, processing, onCancel, onConfirm }: SessionConflictCardProps) {
    return (
        <Card className="border-amber-500/40 bg-amber-500/5" role="alertdialog" aria-labelledby="session-conflict-title">
            <CardHeader className="pb-3">
                <CardTitle id="session-conflict-title" className="flex items-center gap-2 text-base">
                    <Monitor className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    Sesi ini sedang digunakan di tempat lain
                </CardTitle>
                <CardDescription>
                    Untuk masuk di sini, sesi di perangkat lain akan dikeluarkan dari sistem. Pastikan Anda memang pemilik akun ini.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <dl className="bg-muted/40 space-y-2 rounded-md border p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Perangkat</dt>
                        <dd className="text-foreground font-medium">{conflict.device}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Terakhir aktif</dt>
                        <dd className="text-foreground inline-flex items-center gap-1 font-medium">
                            <Clock className="size-3" aria-hidden="true" />
                            {conflict.last_active}
                        </dd>
                    </div>
                    {conflict.ip && (
                        <div className="flex items-center justify-between gap-2">
                            <dt className="text-muted-foreground">Alamat IP</dt>
                            <dd className="text-foreground inline-flex items-center gap-1 font-mono font-medium">
                                <Wifi className="size-3" aria-hidden="true" />
                                {conflict.ip}
                            </dd>
                        </div>
                    )}
                </dl>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                        Batal
                    </Button>
                    <Button type="button" onClick={onConfirm} disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        Keluarkan sesi lain &amp; masuk di sini
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
