import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import FooterSection from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, Copy, Eye, LoaderCircle, Paperclip, Ticket, Trash2, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PublicStatsSection, type PublicStats } from '@/components/public-stats';

interface WelcomePageProps extends SharedData {
    flash: {
        ticket_number?: string;
    };
    channels: ChannelGroup[];
    stats: PublicStats;
}

const SATUAN_TUGAS_OPTIONS = [
    'BPS Provinsi Riau',
    'BPS Kabupaten Kuantan Singingi',
    'BPS Kabupaten Indragiri Hulu',
    'BPS Kabupaten Indragiri Hilir',
    'BPS Kabupaten Pelalawan',
    'BPS Kabupaten Siak',
    'BPS Kabupaten Kampar',
    'BPS Kabupaten Rokan Hulu',
    'BPS Kabupaten Bengkalis',
    'BPS Kabupaten Rokan Hilir',
    'BPS Kabupaten Kepulauan Meranti',
    'BPS Kota Pekanbaru',
    'BPS Kota Dumai',
];

type ClassificationType = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';

interface StoredTicket {
    ticket_number: string;
    created_at: string;
}

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
    const { auth, flash, channels, stats } = usePage<WelcomePageProps>().props;
    const [showDialog, setShowDialog] = useState(false);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [ticketHistory, setTicketHistory] = useState<StoredTicket[]>([]);
    const [previewFile, setPreviewFile] = useState<File | null>(null);

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

    const [ticketToDelete, setTicketToDelete] = useState<StoredTicket | null>(null);

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
            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <div className="flex aspect-square size-10 items-center justify-center rounded-md">
                            <img src="/logo-melati.webp" alt="Logo BPS Melati" className="h-full w-full object-contain" />
                        </div>
                        <div className="ml-1 grid flex-1 text-left text-sm">
                            <img src="/desc-melati.webp" alt="Logo BPS" className="h-[30px] w-[84px] ml-3" />
                        </div>
                        <nav className="flex items-center gap-3">
                            <AppearanceToggleDropdown />
                            <Link
                                href={route('tickets.check')}
                                className="inline-block rounded-md border border-input bg-background px-3.5 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                            >
                                Cek Status Tiket
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={auth.user.role === 'admin' ? route('dashboard.admin.index') : route('dashboard.operator.index')}
                                    className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Login
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-6 pt-12 ">

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
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Masukkan nomor WA (contoh: 08123456789)"
                                    value={data.reporter_wa}
                                    onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                                />
                                {errors.reporter_wa && <p className="text-sm text-destructive">{errors.reporter_wa}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="channel">Sumber Kanal</Label>
                                <Select
                                    value={data.channel_id}
                                    onValueChange={(value) => setData('channel_id', value)}
                                >
                                    <SelectTrigger id="channel">
                                        <SelectValue placeholder="Pilih sumber kanal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {channels.map((group, index) => (
                                            <div key={group.id}>
                                                {index > 0 && <SelectSeparator />}
                                                {group.children.length > 0 ? (
                                                    <SelectGroup>
                                                        <SelectLabel>{group.name}</SelectLabel>
                                                        {group.children.map((child) => (
                                                            <SelectItem key={child.id} value={String(child.id)}>
                                                                {child.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ) : (
                                                    <SelectItem value={String(group.id)}>{group.name}</SelectItem>
                                                )}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.channel_id && <p className="text-sm text-destructive">{errors.channel_id}</p>}
                            </div>
                        </div>

                        {/* Field khusus berdasarkan jenis */}
                        {data.classification === 'pengaduan' && (
                            <>
                                <div className="mb-4 space-y-2">
                                    <Label htmlFor="service-type">Jenis Layanan</Label>
                                    <Select
                                        value={data.service_type}
                                        onValueChange={(value) => setData('service_type', value)}
                                    >
                                        <SelectTrigger id="service-type" className="max-w-xs">
                                            <SelectValue placeholder="Pilih jenis layanan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pst">Layanan PST</SelectItem>
                                            <SelectItem value="lainnya">Layanan Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.service_type && <p className="text-sm text-destructive">{errors.service_type}</p>}
                                </div>
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
                            </>
                        )}

                        {data.classification === 'aspirasi' && (
                            <div className="mb-4 space-y-2">
                                <Label htmlFor="satuan-tugas">Satuan Tugas</Label>
                                <SearchableSelect
                                    options={SATUAN_TUGAS_OPTIONS}
                                    value={data.satuan_tugas}
                                    onChange={(value) => setData('satuan_tugas', value)}
                                    placeholder="Pilih satuan tugas"
                                    searchPlaceholder="Cari satuan tugas..."
                                    error={!!errors.satuan_tugas}
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

                        {/* Lampiran */}
                        <div className="mb-8 space-y-3">
                            <Label>Lampiran (opsional)</Label>
                            <p className="text-xs text-muted-foreground">Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file.</p>

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
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Paperclip className="mr-2 size-4" />
                                        Pilih File
                                    </Button>
                                </div>
                            )}

                            {data.attachments.length > 0 && (
                                <ul className="space-y-2">
                                    {data.attachments.map((file, index) => (
                                        <li
                                            key={`${file.name}-${index}`}
                                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate">{file.name}</span>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    ({formatFileSize(file.size)})
                                                </span>
                                            </div>
                                            <div className="ml-2 flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewFile(file)}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="Lihat"
                                                >
                                                    <Eye className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="Hapus"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {errors.attachments && <p className="text-sm text-destructive">{errors.attachments}</p>}
                            {(errors as Record<string, string>)['attachments.0'] && (
                                <p className="text-sm text-destructive">{(errors as Record<string, string>)['attachments.0']}</p>
                            )}
                            {(errors as Record<string, string>)['attachments.1'] && (
                                <p className="text-sm text-destructive">{(errors as Record<string, string>)['attachments.1']}</p>
                            )}
                            {(errors as Record<string, string>)['attachments.2'] && (
                                <p className="text-sm text-destructive">{(errors as Record<string, string>)['attachments.2']}</p>
                            )}
                        </div>

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
                                {[...ticketHistory].reverse().map((ticket) => (
                                    <div key={`${ticket.ticket_number}-${ticket.created_at}`} className="flex items-center justify-between px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm font-semibold">{ticket.ticket_number}</p>
                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="size-3" />
                                                <span>{formatTicketDate(ticket.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="ml-2 flex shrink-0 items-center gap-1.5">
                                            <Link
                                                href={route('tickets.check', { ticket_number: ticket.ticket_number })}
                                                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                                            >
                                                Cek Status
                                            </Link>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                title="Hapus dari riwayat"
                                                onClick={() => setTicketToDelete(ticket)}
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <PublicStatsSection stats={stats} />

                    <FooterSection/>
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
                        {ticketNumber && (
                            <Button asChild variant="secondary" className="w-full">
                                <Link href={route('tickets.check', { ticket_number: ticketNumber })}>
                                    Cek Status Laporan Ini
                                </Link>
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
                        <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
                        <DialogDescription>
                            {previewFile && formatFileSize(previewFile.size)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-auto">
                        {previewFile && previewUrl && isImageFile(previewFile) && (
                            <img
                                src={previewUrl}
                                alt={previewFile.name}
                                className="mx-auto max-h-[65vh] rounded-md object-contain"
                            />
                        )}

                        {previewFile && previewUrl && isPdfFile(previewFile) && (
                            <iframe
                                src={previewUrl}
                                title={previewFile.name}
                                className="h-[65vh] w-full rounded-md border-0"
                            />
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
                        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
                            <Trash2 className="size-8 text-destructive" />
                        </div>
                        <DialogTitle className="text-center">Hapus dari Riwayat?</DialogTitle>
                        <DialogDescription className="text-center">
                            Nomor tiket <span className="font-mono font-semibold text-foreground">{ticketToDelete?.ticket_number}</span> akan dihapus dari
                            riwayat di perangkat ini. Pastikan Anda sudah menyimpan nomor tiketnya, karena Anda memerlukannya untuk mengecek status laporan.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button variant="destructive" className="w-full" onClick={handleDeleteTicket}>
                            Ya, Hapus
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
