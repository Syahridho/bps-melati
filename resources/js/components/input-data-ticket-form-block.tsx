import { InputDataAttachmentField } from '@/components/input-data-attachment-field';
import { InputDataChannelSelect } from '@/components/input-data-channel-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SATUAN_TUGAS_OPTIONS } from '@/lib/input-data-constants';
import { classificationLabel } from '@/lib/input-data-utils';
import { cn } from '@/lib/utils';
import { type AddTicketFormData, type ChannelGroup, type ClassificationType, type SetTicketFormField } from '@/types/input-data';

interface InputDataTicketFormBlockProps {
    data: AddTicketFormData;
    setData: SetTicketFormField;
    errors: Record<string, string>;
    channels: ChannelGroup[];
    showResponsePanel: boolean;
    setShowResponsePanel: (val: boolean) => void;
    handleFileChange: (files: FileList | null) => void;
    removeFile: (file: File) => void;
    setPreviewFile: (file: File) => void;
}

export function InputDataTicketFormBlock({
    data,
    setData,
    errors,
    channels,
    showResponsePanel,
    setShowResponsePanel,
    handleFileChange,
    removeFile,
    setPreviewFile,
}: InputDataTicketFormBlockProps) {
    return (
        <section className={cn('bg-background custom-scrollbar flex flex-col lg:min-h-0', showResponsePanel ? 'lg:overflow-y-auto lg:border-r' : '')}>
            {showResponsePanel && (
                <div className="bg-background border-b px-4 py-3 sm:px-6 sm:py-4 lg:sticky lg:top-0 lg:z-20">
                    <h3 className="text-sm font-semibold">1. Data Tiket / Laporan</h3>
                    <p className="text-muted-foreground text-xs">Informasi utama laporan yang dimasukkan.</p>
                </div>
            )}

            <div className="flex flex-1 flex-col space-y-4 p-4 sm:space-y-5 sm:p-6">
                <div className="space-y-2" id="jenis-laporan-group">
                    <Label>
                        Jenis Laporan <span className="text-destructive">*</span>
                    </Label>
                    <ToggleGroup
                        type="single"
                        value={data.classification}
                        onValueChange={(val) => {
                            if (val) setData('classification', val as ClassificationType);
                        }}
                        className="flex-wrap justify-start gap-2"
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
                    {errors.classification && <p className="text-destructive text-xs">{errors.classification}</p>}
                </div>

                <div className="@container">
                    <div className="grid grid-cols-1 gap-4 @md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Pelapor (opsional)</Label>
                            <Input
                                id="name"
                                className="text-base sm:text-sm"
                                placeholder="Masukkan nama"
                                value={data.reporter_name}
                                onChange={(e) => setData('reporter_name', e.target.value)}
                            />
                            {errors.reporter_name && <p className="text-destructive text-xs">{errors.reporter_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email (opsional)</Label>
                            <Input
                                id="email"
                                type="email"
                                className="text-base sm:text-sm"
                                placeholder="contoh@domain.com"
                                value={data.reporter_email}
                                onChange={(e) => setData('reporter_email', e.target.value)}
                            />
                            {errors.reporter_email && <p className="text-destructive text-xs">{errors.reporter_email}</p>}
                        </div>

                        <div className="col-span-full space-y-2 @md:col-span-1">
                            <Label htmlFor="wa">WhatsApp (opsional)</Label>
                            <Input
                                id="wa"
                                type="tel"
                                className="text-base sm:text-sm"
                                placeholder="08xxxxxxxxxx"
                                value={data.reporter_wa}
                                onChange={(e) => setData('reporter_wa', e.target.value)}
                            />
                            {errors.reporter_wa && <p className="text-destructive text-xs">{errors.reporter_wa}</p>}
                        </div>
                    </div>
                </div>

                <InputDataChannelSelect
                    value={data.channel_id}
                    channels={channels}
                    onChange={(val) => setData('channel_id', val)}
                    error={errors.channel_id}
                />

                {data.classification === 'pengaduan' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2" id="service-type">
                            <Label htmlFor="service_type">
                                Jenis Layanan <span className="text-destructive">*</span>
                            </Label>
                            <Select value={data.service_type} onValueChange={(val) => setData('service_type', val)}>
                                <SelectTrigger id="service_type">
                                    <SelectValue placeholder="Pilih jenis layanan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pst">Pelayanan Statistik Terpadu (PST)</SelectItem>
                                    <SelectItem value="lainnya">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.service_type && <p className="text-destructive text-xs">{errors.service_type}</p>}
                        </div>

                        <div className="space-y-2" id="tanggal">
                            <Label htmlFor="tanggal_kejadian">Tanggal Kejadian (opsional)</Label>
                            <Input
                                id="tanggal_kejadian"
                                type="date"
                                className="text-base sm:text-sm"
                                value={data.tanggal_kejadian}
                                onChange={(e) => setData('tanggal_kejadian', e.target.value)}
                            />
                            {errors.tanggal_kejadian && <p className="text-destructive text-xs">{errors.tanggal_kejadian}</p>}
                        </div>
                    </div>
                )}

                {data.classification === 'aspirasi' && (
                    <div className="space-y-2" id="satuan-tugas">
                        <Label htmlFor="satuan_tugas">
                            Satuan Tugas Tujuan <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                            options={SATUAN_TUGAS_OPTIONS}
                            value={data.satuan_tugas}
                            onChange={(val) => setData('satuan_tugas', val)}
                            placeholder="Pilih satuan tugas..."
                            searchPlaceholder="Cari satuan tugas..."
                        />
                        {errors.satuan_tugas && <p className="text-destructive text-xs">{errors.satuan_tugas}</p>}
                    </div>
                )}

                <div className="space-y-2" id="judul">
                    <Label htmlFor="title">
                        Judul {data.classification ? classificationLabel(data.classification) : 'Laporan'} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="title"
                        className="text-base sm:text-sm"
                        placeholder="Ringkasan singkat laporan"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        required
                    />
                    {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
                </div>

                <div className="space-y-2" id="isi">
                    <Label htmlFor="content">
                        Isi {data.classification ? classificationLabel(data.classification) : 'Laporan'} <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="content"
                        className="text-base sm:text-sm"
                        placeholder="Uraikan detail laporan secara lengkap..."
                        rows={5}
                        value={data.content}
                        onChange={(e) => setData('content', e.target.value)}
                        required
                    />
                    {errors.content && <p className="text-destructive text-xs">{errors.content}</p>}
                </div>

                <InputDataAttachmentField
                    id="ticket-attachments"
                    label="Lampiran Bukti / Berkas (opsional)"
                    description="Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file."
                    files={data.attachments}
                    error={errors.attachments}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    onPreview={setPreviewFile}
                />

                <div className="border-border/60 bg-muted/40 mt-2 flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="direct-response-toggle" className="text-sm font-medium">
                            Jawab / Selesaikan Langsung
                        </Label>
                        <p className="text-muted-foreground text-xs">
                            Kirim tanggapan langsung sekarang. Laporan akan otomatis berstatus <strong>Selesai</strong>.
                        </p>
                    </div>
                    <Checkbox
                        id="direct-response-toggle"
                        checked={showResponsePanel}
                        onCheckedChange={(checked) => {
                            const val = !!checked;
                            setShowResponsePanel(val);
                            if (!val) {
                                setData('response_message', '');
                            }
                        }}
                    />
                </div>
            </div>
        </section>
    );
}

export { InputDataTicketFormBlock as TicketFormBlock };
