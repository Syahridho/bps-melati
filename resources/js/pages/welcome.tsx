import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import FooterSection from '@/components/footer';
import { PublicStatsSection, type PublicStats } from '@/components/public-stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Circle, Clock, Copy, Eye, HelpCircle, Lightbulb, LoaderCircle, Paperclip, Ticket, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';

interface ChannelChild {
    id: number;
    name: string;
}

interface ChannelGroup {
    id: number;
    name: string;
    children: ChannelChild[];
}

interface WelcomePageProps extends SharedData {
    flash: {
        ticket_number?: string;
    };
    channels: ChannelGroup[];
    stats: PublicStats;
}

type ClassificationType = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';

interface StoredTicket {
    ticket_number: string;
    created_at: string;
}

// Warna ikon mengikuti warna kategori di dashboard admin agar konsisten.
const CLASSIFICATIONS: {
    value: ClassificationType;
    label: string;
    description: string;
    icon: React.ElementType;
    iconClass: string;
}[] = [
    {
        value: 'pengaduan',
        label: 'Pengaduan',
        description: 'Laporkan masalah atau ketidakpuasan terhadap layanan.',
        icon: AlertCircle,
        iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
        value: 'aspirasi',
        label: 'Aspirasi',
        description: 'Sampaikan saran, masukan, atau ide perbaikan.',
        icon: Lightbulb,
        iconClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    },
    {
        value: 'permintaan_informasi',
        label: 'Permintaan Informasi',
        description: 'Ajukan permohonan data atau informasi.',
        icon: HelpCircle,
        iconClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
];

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

function SectionTitle({ title, description }: { title: ReactNode; description?: string }) {
    return (
        <div className="space-y-0.5">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }
    return <p className="text-destructive text-sm">{message}</p>;
}

export default function Welcome() {
    const { auth, flash, stats } = usePage<WelcomePageProps>().props;
    const [showDialog, setShowDialog] = useState(false);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [ticketHistory, setTicketHistory] = useState<StoredTicket[]>([]);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [ticketToDelete, setTicketToDelete] = useState<StoredTicket | null>(null);

    const previewUrl = useMemo(() => {
        if (!previewFile) {
            return null;
        }
        return URL.createObjectURL(previewFile);
    }, [previewFile]);

    // Revoke object URL saat preview ditutup atau file berubah
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const { data, setData, post, processing, errors, reset } = useForm({
        classification: '' as ClassificationType | '',
        channel_id: '',
        reporter_name: '',
        reporter_email: '',
        reporter_wa: '',
        title: '',
        content: '',
        service_type: '',
        tanggal_kejadian: '',
        satuan_tugas: '',
        attachments: [] as File[],
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, [flash?.ticket_number, reset]);

    const selectedLabel = CLASSIFICATIONS.find((c) => c.value === data.classification)?.label;
    const fieldErrors = errors as Record<string, string | undefined>;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('tickets.store'), {
            forceFormData: true,
        });
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        const combined = [...data.attachments, ...files].slice(0, 3);
        setData('attachments', combined);

        // Reset input agar bisa pilih file yang sama lagi
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function removeFile(index: number) {
        setData(
            'attachments',
            data.attachments.filter((_, i) => i !== index),
        );
    }

    function isImageFile(file: File): boolean {
        return file.type.startsWith('image/');
    }

    function isPdfFile(file: File): boolean {
        return file.type === 'application/pdf';
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    function handleDeleteTicket() {
        if (!ticketToDelete) {
            return;
        }

        const updated = getStoredTickets().filter((t) => t.ticket_number !== ticketToDelete.ticket_number);
        localStorage.setItem('melati_tickets', JSON.stringify(updated));
        setTicketHistory(updated);
        setTicketToDelete(null);
    }

    return (
        <>
            <Head title="Selamat Datang" />
            <div className="bg-muted/30 text-foreground min-h-screen overflow-x-clip">
                {/* Header */}
                <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
                    <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
                        <img src="/logo-melati.webp" alt="Logo BPS Melati" className="size-9 shrink-0 object-contain sm:size-10" />
                        <img src="/desc-melati.webp" alt="Logo BPS" className="h-[26px] w-[74px] shrink-0 object-contain sm:h-[30px] sm:w-[84px]" />

                        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2">
                            <AppearanceToggleDropdown />
                            <Button asChild variant="outline" size="sm">
                                <Link href={route('tickets.check')}>
                                    <span className="sm:hidden">Cek Tiket</span>
                                    <span className="hidden sm:inline">Cek Status Tiket</span>
                                </Link>
                            </Button>
                            {auth.user && (
                                <Button asChild size="sm">
                                    <Link href={auth.user.role === 'admin' ? route('dashboard.admin.index') : route('dashboard.operator.index')}>
                                        Dashboard
                                    </Link>
                                </Button>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-4 pt-8 pb-0 sm:px-6 sm:pt-12">
                    {/* Pengantar */}
                    <div className="mx-auto mb-6 max-w-2xl space-y-3 text-center sm:mb-8">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sampaikan Laporan Anda</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Layanan pengaduan, aspirasi, dan permintaan informasi. Anda akan mendapat nomor tiket untuk memantau tindak lanjutnya.
                        </p>
                    </div>

                    {/* Formulir */}
                    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl min-w-0">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Formulir Laporan</CardTitle>
                                <CardDescription>Pilih jenis laporan, lalu lengkapi detailnya.</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-8">
                                {/* Jenis laporan */}
                                <div role="radiogroup" aria-labelledby="jenis-label" className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    {CLASSIFICATIONS.map((option) => {
                                        const selected = data.classification === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => setData('classification', option.value)}
                                                className={cn(
                                                    'focus-visible:ring-ring/50 flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]',
                                                    selected
                                                        ? 'border-primary bg-primary/5 text-primary ring-primary ring-1'
                                                        : 'bg-card hover:bg-accent',
                                                )}
                                            >
                                                {selected ? (
                                                    <CheckCircle2 className="text-primary size-4 shrink-0" />
                                                ) : (
                                                    <Circle className="text-muted-foreground size-4 shrink-0" />
                                                )}
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t" />

                                <div className="!mb-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nama">Nama</Label>
                                        <Input
                                            id="nama"
                                            placeholder="Masukkan nama"
                                            value={data.reporter_name}
                                            onChange={(e) => setData('reporter_name', e.target.value)}
                                        />
                                        <FieldError message={errors.reporter_name} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="nama@email.com"
                                            value={data.reporter_email}
                                            onChange={(e) => setData('reporter_email', e.target.value)}
                                        />
                                        <FieldError message={errors.reporter_email} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="wa">WhatsApp</Label>
                                        <Input
                                            id="wa"
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder="08********"
                                            value={data.reporter_wa}
                                            onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                                        />
                                        <FieldError message={errors.reporter_wa} />
                                    </div>
                                </div>

                                {/* Detail laporan */}
                                <div className="space-y-4">
                                    {!data.classification ? (
                                        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                            Pilih jenis laporan terlebih dahulu untuk mengisi detailnya.
                                        </div>
                                    ) : (
                                        <>
                                            {data.classification === 'pengaduan' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="tanggal">Tanggal kejadian (opsional)</Label>
                                                    <Input
                                                        id="tanggal"
                                                        type="date"
                                                        className="w-full"
                                                        value={data.tanggal_kejadian}
                                                        onChange={(e) => setData('tanggal_kejadian', e.target.value)}
                                                    />
                                                    <FieldError message={errors.tanggal_kejadian} />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="judul">
                                                    Judul {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="judul"
                                                    placeholder={`Tuliskan judul ${selectedLabel?.toLowerCase()} Anda`}
                                                    value={data.title}
                                                    onChange={(e) => setData('title', e.target.value)}
                                                    required
                                                />
                                                <FieldError message={errors.title} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="isi">
                                                    Isi {selectedLabel?.toLowerCase()} <span className="text-destructive">*</span>
                                                </Label>
                                                <Textarea
                                                    id="isi"
                                                    placeholder={`Tuliskan isi ${selectedLabel?.toLowerCase()} Anda`}
                                                    rows={6}
                                                    value={data.content}
                                                    onChange={(e) => setData('content', e.target.value)}
                                                />
                                                <FieldError message={errors.content} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="border-t" />

                                {/* Lampiran */}
                                <div className="space-y-3">
                                    <SectionTitle
                                        title="Lampiran (opsional)"
                                        description="Format JPG, PNG, atau PDF. Maksimal 2 MB per file dan 3 file."
                                    />

                                    {data.attachments.length < 3 && (
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                multiple
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="file-input"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full sm:w-auto"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip className="size-4" />
                                                Pilih file
                                            </Button>
                                        </div>
                                    )}

                                    {data.attachments.length > 0 && (
                                        <ul className="space-y-2">
                                            {data.attachments.map((file, index) => (
                                                <li
                                                    key={`${file.name}-${index}`}
                                                    className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                                >
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <Paperclip className="text-muted-foreground size-4 shrink-0" />
                                                        <span className="truncate">{file.name}</span>
                                                        <span className="text-muted-foreground shrink-0 text-xs">({formatFileSize(file.size)})</span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground size-7"
                                                            title="Lihat"
                                                            onClick={() => setPreviewFile(file)}
                                                        >
                                                            <Eye className="size-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground size-7"
                                                            title="Hapus"
                                                            onClick={() => removeFile(index)}
                                                        >
                                                            <X className="size-4" />
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <FieldError message={errors.attachments} />
                                    {['attachments.0', 'attachments.1', 'attachments.2'].map((key) => (
                                        <FieldError key={key} message={fieldErrors[key]} />
                                    ))}
                                </div>
                            </CardContent>

                            <CardFooter className="border-t pt-6">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full sm:ml-auto sm:w-auto sm:px-10"
                                    disabled={processing || !data.classification}
                                >
                                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                                    Kirim laporan
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>

                    {/* Riwayat tiket dari localStorage */}
                    {ticketHistory.length > 0 && (
                        <Card className="mx-auto mt-8 max-w-2xl shadow-xs">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Ticket className="text-muted-foreground size-5" />
                                    Riwayat laporan Anda
                                </CardTitle>
                                <CardDescription>Tersimpan di perangkat ini.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y border-t">
                                    {[...ticketHistory].reverse().map((ticket) => (
                                        <div
                                            key={`${ticket.ticket_number}-${ticket.created_at}`}
                                            className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm font-semibold break-all">{ticket.ticket_number}</p>
                                                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                                                    <Clock className="size-3 shrink-0" />
                                                    <span>{formatTicketDate(ticket.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={route('tickets.check', { ticket_number: ticket.ticket_number })}>Cek status</Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8"
                                                    title="Hapus dari riwayat"
                                                    onClick={() => setTicketToDelete(ticket)}
                                                >
                                                    <X className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <PublicStatsSection stats={stats} />

                    <FooterSection />
                </main>
            </div>

            {/* Dialog popup nomor tiket */}
            <Dialog open={showDialog} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-center">Laporan berhasil dikirim</DialogTitle>
                        <DialogDescription className="text-center">Simpan nomor tiket berikut untuk memantau status laporan Anda.</DialogDescription>
                    </DialogHeader>

                    {ticketNumber && (
                        <div className="bg-muted/50 rounded-lg border p-4">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Nomor tiket</p>
                            <p className="text-lg font-bold tracking-wide break-all">{ticketNumber}</p>
                        </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button onClick={handleCopy} variant="outline" className="w-full">
                            <Copy className="size-4" />
                            {copied ? 'Tersalin' : 'Salin nomor tiket'}
                        </Button>
                        {ticketNumber && (
                            <Button asChild variant="secondary" className="w-full">
                                <Link href={route('tickets.check', { ticket_number: ticketNumber })}>Cek status laporan ini</Link>
                            </Button>
                        )}
                        <Button onClick={handleDialogClose} className="w-full">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog preview lampiran */}
            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">{previewFile?.name}</DialogTitle>
                        <DialogDescription>{previewFile && formatFileSize(previewFile.size)}</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-auto">
                        {previewFile && previewUrl && isImageFile(previewFile) && (
                            <img src={previewUrl} alt={previewFile.name} className="mx-auto max-h-[65vh] rounded-md object-contain" />
                        )}

                        {previewFile && previewUrl && isPdfFile(previewFile) && (
                            <iframe src={previewUrl} title={previewFile.name} className="h-[65vh] w-full rounded-md border-0" />
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setPreviewFile(null)} className="w-full sm:w-auto">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog konfirmasi hapus riwayat tiket */}
            <Dialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="bg-destructive/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
                            <Trash2 className="text-destructive size-8" />
                        </div>
                        <DialogTitle className="text-center">Hapus dari riwayat?</DialogTitle>
                        <DialogDescription className="text-center">
                            Nomor tiket <span className="text-foreground font-mono font-semibold break-all">{ticketToDelete?.ticket_number}</span>{' '}
                            akan dihapus dari riwayat di perangkat ini. Pastikan Anda sudah menyimpan nomor tiketnya, karena Anda memerlukannya untuk
                            mengecek status laporan.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button variant="destructive" className="w-full" onClick={handleDeleteTicket}>
                            Ya, hapus
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setTicketToDelete(null)}>
                            Batal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
