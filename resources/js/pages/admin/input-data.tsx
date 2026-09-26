import { Pagination, type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Eye, FileText, Image as ImageIcon, Inbox, LoaderCircle, Paperclip, Plus, Search, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const SATUAN_TUGAS_OPTIONS = [
    'BPS Provinsi Riau (berkedudukan di Pekanbaru)',
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
type StatusType = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
type FilterTab = 'semua' | 'pengaduan' | 'aspirasi' | 'permintaan';

interface TicketItem {
    id: number;
    ticket_number: string;
    classification: ClassificationType;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: StatusType;
    is_read?: boolean;
    source_app: string;
    channel: string;
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

interface InputDataPageProps extends SharedData {
    tickets: PaginatedData<TicketItem>;
    channels: ChannelGroup[];
    filters: {
        search: string;
        filter: FilterTab;
        per_page: number;
    };
    counts: {
        semua: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
    };
    flash: {
        ticket_number?: string;
        success?: string;
    };
}

function classificationLabel(classification: ClassificationType): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
    }
}

function classificationVariant(classification: ClassificationType): 'default' | 'secondary' | 'destructive' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

function statusLabel(status: StatusType): string {
    switch (status) {
        case 'baru':
            return 'Baru';
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        case 'selesai':
            return 'Selesai';
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
        return 'Kemarin';
    }
    if (diffDays < 7) {
        return `${diffDays} hari lalu`;
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export default function InputData() {
    const { tickets, channels, filters, counts, flash } = usePage<InputDataPageProps>().props;

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state
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

    // Attachment Preview State inside modal
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const previewUrl = useMemo(() => {
        if (!previewFile) return null;
        return URL.createObjectURL(previewFile);
    }, [previewFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        router.get(
            route('dashboard.admin.input-data.index'),
            { filter: filters.filter, search: query, per_page: filters.per_page, page: 1 },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleFilterChange = (tab: FilterTab) => {
        router.get(
            route('dashboard.admin.input-data.index'),
            { filter: tab, search: searchQuery, per_page: filters.per_page, page: 1 },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(
            route('dashboard.admin.input-data.index'),
            { filter: filters.filter, search: searchQuery, per_page: newPerPage, page: 1 },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    function toggleSelect(id: number) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        if (selectedIds.length === tickets.data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(tickets.data.map((t) => t.id));
        }
    }

    const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'pengaduan', label: 'Pengaduan', count: counts.pengaduan },
        { key: 'aspirasi', label: 'Aspirasi', count: counts.aspirasi },
        { key: 'permintaan', label: 'Permintaan Info', count: counts.permintaan },
    ];

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);

        const validFiles = newFiles.filter((file) => {
            const isLt2MB = file.size <= 2 * 1024 * 1024;
            const isValidType = isImageFile(file) || isPdfFile(file);
            return isLt2MB && isValidType;
        });

        const updated = [...data.attachments, ...validFiles].slice(0, 3);
        setData('attachments', updated);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        const updated = data.attachments.filter((_, i) => i !== index);
        setData('attachments', updated);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('dashboard.admin.input-data.store'), {
            onSuccess: () => {
                reset();
                setIsAddDialogOpen(false);
            },
        });
    };

    return (
        <AdminPage
            title="Input Data"
            description="Kelola dan masukkan data tiket secara manual"
            breadcrumbs={[{ title: 'Input Data', href: route('dashboard.admin.input-data.index') }]}
        >
            <div className="space-y-6">
                {/* Header & Success Alert */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Input Data</h2>
                        <p className="text-sm text-muted-foreground">
                            Kelola dan tambahkan laporan, aspirasi, atau permintaan informasi baru.
                        </p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="shrink-0 gap-2">
                        <Plus className="h-4 w-4" />
                        Tambah Data Baru
                    </Button>
                </div>

                {/* Inbox Card Layout like Laporan Masuk */}
                <div className="overflow-hidden rounded-lg border bg-card">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <Checkbox
                            checked={tickets.data.length > 0 && selectedIds.length === tickets.data.length}
                            onCheckedChange={toggleSelectAll}
                        />
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari laporan..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleFilterChange(tab.key)}
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                                    filters.filter === tab.key
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span
                                        className={cn(
                                            'inline-flex size-5 items-center justify-center rounded-full text-[10px]',
                                            filters.filter === tab.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20',
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Ticket list */}
                    <div className="divide-y">
                        {tickets.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <Inbox className="mb-3 size-10" />
                                <p className="text-sm">Tidak ada laporan ditemukan</p>
                            </div>
                        ) : (
                            tickets.data.map((ticket) => (
                                <div key={ticket.id} className="group transition-colors hover:bg-muted/50">
                                    <div className="flex gap-3 px-4 py-3">
                                        <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox checked={selectedIds.includes(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                                        </div>
                                        <Link
                                            href={route('dashboard.admin.laporan-masuk.show', { ticketNumber: ticket.ticket_number })}
                                            className="min-w-0 flex-1"
                                        >
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium text-foreground">
                                                    {ticket.reporter_name ?? 'Anonim'}
                                                </span>
                                                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
                                            </div>
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="truncate text-sm font-medium text-foreground">
                                                    {ticket.ticket_number}
                                                </span>
                                            </div>
                                            <p className="mb-2 truncate text-xs text-muted-foreground">{ticket.content}</p>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant={classificationVariant(ticket.classification)} className="text-[10px]">
                                                    {classificationLabel(ticket.classification)}
                                                </Badge>
                                                {ticket.status !== 'baru' && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {statusLabel(ticket.status)}
                                                    </Badge>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">{ticket.channel}</span>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Footer */}
                    <Pagination
                        links={tickets.links}
                        from={tickets.from}
                        to={tickets.to}
                        total={tickets.total}
                        currentPage={tickets.current_page}
                        lastPage={tickets.last_page}
                        perPage={filters.per_page}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </div>

            {/* Modal Dialog Tambah Data Baru */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tambah Data Baru</DialogTitle>
                        <DialogDescription>
                            Isi formulir di bawah ini untuk menambahkan tiket pengaduan, aspirasi, atau permintaan informasi.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        {/* 1. Klasifikasi */}
                        <div className="space-y-2">
                            <Label>Jenis Laporan <span className="text-destructive">*</span></Label>
                            <ToggleGroup
                                type="single"
                                value={data.classification}
                                onValueChange={(val) => {
                                    if (val) setData('classification', val as ClassificationType);
                                }}
                                className="justify-start gap-2"
                            >
                                <ToggleGroupItem value="pengaduan" variant="outline" className="px-4 py-2 text-xs font-medium">
                                    Pengaduan
                                </ToggleGroupItem>
                                <ToggleGroupItem value="aspirasi" variant="outline" className="px-4 py-2 text-xs font-medium">
                                    Aspirasi
                                </ToggleGroupItem>
                                <ToggleGroupItem value="permintaan_informasi" variant="outline" className="px-4 py-2 text-xs font-medium">
                                    Permintaan Informasi
                                </ToggleGroupItem>
                            </ToggleGroup>
                            {errors.classification && <p className="text-xs text-destructive">{errors.classification}</p>}
                        </div>

                        {/* 2. Pelapor (Nama, Email, WA) */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Pelapor (opsional)</Label>
                                <Input
                                    id="name"
                                    placeholder="Masukkan nama"
                                    value={data.reporter_name}
                                    onChange={(e) => setData('reporter_name', e.target.value)}
                                />
                                {errors.reporter_name && <p className="text-xs text-destructive">{errors.reporter_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email (opsional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="contoh@domain.com"
                                    value={data.reporter_email}
                                    onChange={(e) => setData('reporter_email', e.target.value)}
                                />
                                {errors.reporter_email && <p className="text-xs text-destructive">{errors.reporter_email}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="wa">WhatsApp (opsional)</Label>
                                <Input
                                    id="wa"
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="08123456789"
                                    value={data.reporter_wa}
                                    onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                                />
                                {errors.reporter_wa && <p className="text-xs text-destructive">{errors.reporter_wa}</p>}
                            </div>
                        </div>

                        {/* 3. Sumber Kanal */}
                        <div className="space-y-2">
                            <Label htmlFor="channel">Sumber Kanal <span className="text-destructive">*</span></Label>
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
                            {errors.channel_id && <p className="text-xs text-destructive">{errors.channel_id}</p>}
                        </div>

                        {/* 4. Field khusus berdasarkan jenis */}
                        {data.classification === 'pengaduan' && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="service-type">Jenis Layanan <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={data.service_type}
                                        onValueChange={(value) => setData('service_type', value)}
                                    >
                                        <SelectTrigger id="service-type">
                                            <SelectValue placeholder="Pilih jenis layanan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pst">Layanan PST</SelectItem>
                                            <SelectItem value="lainnya">Layanan Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.service_type && <p className="text-xs text-destructive">{errors.service_type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tanggal">Tanggal Kejadian <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="tanggal"
                                        type="date"
                                        value={data.tanggal_kejadian}
                                        onChange={(e) => setData('tanggal_kejadian', e.target.value)}
                                    />
                                    {errors.tanggal_kejadian && <p className="text-xs text-destructive">{errors.tanggal_kejadian}</p>}
                                </div>
                            </div>
                        )}

                        {data.classification === 'aspirasi' && (
                            <div className="space-y-2">
                                <Label htmlFor="satuan-tugas">Satuan Tugas <span className="text-destructive">*</span></Label>
                                <SearchableSelect
                                    options={SATUAN_TUGAS_OPTIONS}
                                    value={data.satuan_tugas}
                                    onChange={(value) => setData('satuan_tugas', value)}
                                    placeholder="Pilih satuan tugas"
                                    searchPlaceholder="Cari satuan tugas..."
                                    error={!!errors.satuan_tugas}
                                />
                                {errors.satuan_tugas && <p className="text-xs text-destructive">{errors.satuan_tugas}</p>}
                            </div>
                        )}

                        {/* 5. Isi Laporan */}
                        {data.classification && (
                            <div className="space-y-2">
                                <Label htmlFor="isi">
                                    Isi {classificationLabel(data.classification)} <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="isi"
                                    placeholder={`Tuliskan isi ${classificationLabel(data.classification).toLowerCase()} di sini...`}
                                    rows={4}
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                />
                                {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                            </div>
                        )}

                        {/* 6. Lampiran */}
                        <div className="space-y-2">
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
                                        id="modal-file-input"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Paperclip className="mr-2 h-4 w-4" />
                                        Pilih File
                                    </Button>
                                </div>
                            )}

                            {data.attachments.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    {data.attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {isImageFile(file) ? (
                                                    <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                                ) : (
                                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                )}
                                                <span className="truncate font-medium">{file.name}</span>
                                                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setPreviewFile(file)}
                                                    title="Lihat Pratinjau"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive"
                                                    onClick={() => handleRemoveFile(index)}
                                                    title="Hapus File"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    reset();
                                    setIsAddDialogOpen(false);
                                }}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing || !data.classification}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Data
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Sub-Dialog Preview Lampiran */}
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
        </AdminPage>
    );
}
