import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, Copy, LoaderCircle, Ticket } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

type ClassificationType = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';

interface StoredTicket {
    ticket_number: string;
    created_at: string;
}

interface WelcomePageProps extends SharedData {
    flash: {
        ticket_number?: string;
    };
}

function getStoredTickets(): StoredTicket[] {
    try {
        return JSON.parse(localStorage.getItem('melati_tickets') ?? '[]') as StoredTicket[];
    } catch {
        return [];
    }
}

function formatTicketDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Welcome() {
    const { auth, flash } = usePage<WelcomePageProps>().props;
    const [showDialog, setShowDialog] = useState(false);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [ticketHistory, setTicketHistory] = useState<StoredTicket[]>([]);

    const { data, setData, post, processing, errors, reset } = useForm({
        classification: '' as ClassificationType | '',
        reporter_name: '',
        reporter_email: '',
        reporter_wa: '',
        content: '',
        tanggal_kejadian: '',
        satuan_tugas: '',
    });

    // Load riwayat tiket dari localStorage saat mount
    useEffect(() => {
        setTicketHistory(getStoredTickets());
    }, []);

    useEffect(() => {
        if (flash?.ticket_number) {
            setTicketNumber(flash.ticket_number);
            setShowDialog(true);

            // Simpan ke localStorage
            const stored = getStoredTickets();
            stored.push({
                ticket_number: flash.ticket_number,
                created_at: new Date().toISOString(),
            });
            localStorage.setItem('melati_tickets', JSON.stringify(stored));
            setTicketHistory(stored);

            reset();
        }
    }, [flash?.ticket_number]);

    function classificationLabel(value: ClassificationType): string {
        switch (value) {
            case 'pengaduan':
                return 'Pengaduan';
            case 'aspirasi':
                return 'Aspirasi';
            case 'permintaan_informasi':
                return 'Permintaan Informasi';
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('tickets.store'));
    }

    function handleCopy() {
        if (ticketNumber) {
            navigator.clipboard.writeText(ticketNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    function handleDialogClose() {
        setShowDialog(false);
        setTicketNumber(null);
    }

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <h1 className="text-lg font-semibold">Melati</h1>
                        <nav className="flex items-center gap-4">
                            <AppearanceToggleDropdown />
                            {auth.user ? (
                                <Link
                                    href={auth.user.role === 'admin' ? route('dashboard.admin.index') : route('dashboard.operator.index')}
                                    className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-6 py-12">
                    <h2 className="mb-2 text-xl font-semibold">Pilih Jenis</h2>
                    <p className="mb-6 text-sm text-muted-foreground">Silakan pilih salah satu jenis berikut.</p>

                    <form onSubmit={handleSubmit}>
                        {/* Button group pilihan jenis */}
                        <ToggleGroup
                            type="single"
                            value={data.classification}
                            onValueChange={(value) => setData('classification', value as ClassificationType | '')}
                            className="mb-2 w-full justify-start gap-0"
                        >
                            <ToggleGroupItem
                                value="pengaduan"
                                variant="outline"
                                className="h-14 flex-1 rounded-r-none border-r-0 px-8 text-base font-semibold tracking-wide data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                PENGADUAN
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="aspirasi"
                                variant="outline"
                                className="h-14 flex-1 rounded-none border-r-0 px-8 text-base font-semibold tracking-wide data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                ASPIRASI
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="permintaan_informasi"
                                variant="outline"
                                className="h-14 flex-1 rounded-l-none px-8 text-base font-semibold tracking-wide data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                PERMINTAAN INFORMASI
                            </ToggleGroupItem>
                        </ToggleGroup>
                        {errors.classification && <p className="mb-6 text-sm text-destructive">{errors.classification}</p>}
                        {!errors.classification && <div className="mb-8" />}

                        {/* Input Nama, Email, WA (opsional) */}
                        <div className="mb-8 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nama">Nama (opsional)</Label>
                                <Input
                                    id="nama"
                                    placeholder="Masukkan nama"
                                    value={data.reporter_name}
                                    onChange={(e) => setData('reporter_name', e.target.value)}
                                />
                                {errors.reporter_name && <p className="text-sm text-destructive">{errors.reporter_name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (opsional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Masukkan email"
                                    value={data.reporter_email}
                                    onChange={(e) => setData('reporter_email', e.target.value)}
                                />
                                {errors.reporter_email && <p className="text-sm text-destructive">{errors.reporter_email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wa">WhatsApp (opsional)</Label>
                                <Input
                                    id="wa"
                                    type="tel"
                                    placeholder="Masukkan nomor WA"
                                    value={data.reporter_wa}
                                    onChange={(e) => setData('reporter_wa', e.target.value)}
                                />
                                {errors.reporter_wa && <p className="text-sm text-destructive">{errors.reporter_wa}</p>}
                            </div>
                        </div>

                        {/* Field khusus berdasarkan jenis */}
                        {data.classification === 'pengaduan' && (
                            <div className="mb-4 space-y-2">
                                <Label htmlFor="tanggal">Tanggal Kejadian</Label>
                                <Input
                                    id="tanggal"
                                    type="date"
                                    className="max-w-xs"
                                    value={data.tanggal_kejadian}
                                    onChange={(e) => setData('tanggal_kejadian', e.target.value)}
                                />
                                {errors.tanggal_kejadian && <p className="text-sm text-destructive">{errors.tanggal_kejadian}</p>}
                            </div>
                        )}

                        {data.classification === 'aspirasi' && (
                            <div className="mb-4 space-y-2">
                                <Label htmlFor="satuan-tugas">Satuan Tugas</Label>
                                <Input
                                    id="satuan-tugas"
                                    placeholder="Masukkan satuan tugas"
                                    value={data.satuan_tugas}
                                    onChange={(e) => setData('satuan_tugas', e.target.value)}
                                />
                                {errors.satuan_tugas && <p className="text-sm text-destructive">{errors.satuan_tugas}</p>}
                            </div>
                        )}

                        {/* Textbox isi */}
                        {data.classification && (
                            <div className="mb-8 space-y-2">
                                <Label htmlFor="isi">Isi {classificationLabel(data.classification)}</Label>
                                <Textarea
                                    id="isi"
                                    placeholder={`Tuliskan isi ${classificationLabel(data.classification).toLowerCase()} Anda di sini...`}
                                    rows={6}
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                />
                                {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
                            </div>
                        )}

                        {/* Tombol Kirim */}
                        <Button type="submit" size="lg" disabled={processing || !data.classification}>
                            {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                            Kirim
                        </Button>
                    </form>

                    {/* Riwayat tiket dari localStorage */}
                    {ticketHistory.length > 0 && (
                        <div className="mt-12">
                            <div className="mb-4 flex items-center gap-2">
                                <Ticket className="size-5 text-muted-foreground" />
                                <h3 className="text-lg font-semibold">Riwayat Laporan Anda</h3>
                            </div>
                            <div className="divide-y rounded-lg border">
                                {[...ticketHistory].reverse().map((ticket, index) => (
                                    <div key={index} className="flex items-center justify-between px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm font-semibold">{ticket.ticket_number}</p>
                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="size-3" />
                                                <span>{formatTicketDate(ticket.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Dialog popup nomor tiket */}
            <Dialog open={showDialog} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-center">Laporan Berhasil Dikirim!</DialogTitle>
                        <DialogDescription className="text-center">
                            Simpan nomor tiket berikut untuk memantau status laporan Anda.
                        </DialogDescription>
                    </DialogHeader>

                    {ticketNumber && (
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Nomor Tiket</p>
                            <p className="text-lg font-bold tracking-wide">{ticketNumber}</p>
                        </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button onClick={handleCopy} variant="outline" className="w-full">
                            <Copy className="mr-2 size-4" />
                            {copied ? 'Tersalin!' : 'Salin Nomor Tiket'}
                        </Button>
                        <Button onClick={handleDialogClose} className="w-full">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
