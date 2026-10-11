import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { SATUAN_TUGAS_OPTIONS } from '../constants';
import { type AddTicketFormData, ChannelGroup, ClassificationType, type SetTicketFormField } from '../types';
import { classificationLabel } from '../utils';
import { AttachmentField } from './attachment-field';
import { ChannelSelect } from './channel-select';

interface TicketFormBlockProps {
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

export function TicketFormBlock({
    data,
    setData,
    errors,
    channels,
    showResponsePanel,
    setShowResponsePanel,
    handleFileChange,
    removeFile,
    setPreviewFile,
}: TicketFormBlockProps) {
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
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="08123456789"
                                value={data.reporter_wa}
                                onChange={(e) => setData('reporter_wa', e.target.value.replace(/\D/g, ''))}
                            />
                            {errors.reporter_wa && <p className="text-destructive text-xs">{errors.reporter_wa}</p>}
                        </div>
                    </div>
                </div>

                <ChannelSelect value={data.channel_id} channels={channels} onChange={(val) => setData('channel_id', val)} error={errors.channel_id} />

                {data.classification === 'pengaduan' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="service-type">
                                Jenis Layanan <span className="text-destructive">*</span>
                            </Label>
                            <Select value={data.service_type} onValueChange={(value) => setData('service_type', value)}>
                                <SelectTrigger id="service-type" className="text-base sm:text-sm">
                                    <SelectValue placeholder="Pilih jenis layanan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pst">Layanan PST</SelectItem>
                                    <SelectItem value="lainnya">Layanan Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.service_type && <p className="text-destructive text-xs">{errors.service_type}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tanggal">
                                Tanggal Kejadian <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="tanggal"
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
                    <div className="space-y-2">
                        <Label htmlFor="satuan-tugas">
                            Satuan Tugas <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                            options={SATUAN_TUGAS_OPTIONS}
                            value={data.satuan_tugas}
                            onChange={(value) => setData('satuan_tugas', value)}
                            placeholder="Pilih satuan tugas"
                            searchPlaceholder="Cari satuan tugas..."
                            error={!!errors.satuan_tugas}
                        />
                        {errors.satuan_tugas && <p className="text-destructive text-xs">{errors.satuan_tugas}</p>}
                    </div>
                )}

                {data.classification && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="judul">
                                Judul {classificationLabel(data.classification as ClassificationType)} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="judul"
                                className="text-base sm:text-sm"
                                placeholder={`Tuliskan judul ${classificationLabel(data.classification as ClassificationType).toLowerCase()} di sini...`}
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                required
                            />
                            {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="isi">
                                Isi {classificationLabel(data.classification as ClassificationType)} <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="isi"
                                className="text-base sm:text-sm"
                                placeholder={`Tuliskan isi ${classificationLabel(data.classification as ClassificationType).toLowerCase()} di sini...`}
                                rows={4}
                                value={data.content}
                                onChange={(e) => setData('content', e.target.value)}
                            />
                            {errors.content && <p className="text-destructive text-xs">{errors.content}</p>}
                        </div>
                    </>
                )}

                <AttachmentField
                    id="ticket-attachments"
                    label="Lampiran (opsional)"
                    description="Format: JPG, PNG, PDF. Maksimal 2MB per file, maksimal 3 file."
                    files={data.attachments}
                    error={errors.attachments}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    onPreview={setPreviewFile}
                />

                <div className="flex-1"></div>

                <div className="mt-auto flex items-center space-x-2 border-t pt-4">
                    <Checkbox
                        id="forward-jawab-check"
                        checked={showResponsePanel}
                        onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            setShowResponsePanel(isChecked);
                            if (!isChecked) {
                                setData('response_message', '');
                                setData('response_attachments', []);
                            }
                        }}
                    />
                    <Label htmlFor="forward-jawab-check" className="cursor-pointer text-sm font-medium">
                        Forward / Jawab Laporan Langsung
                    </Label>
                </div>
            </div>
        </section>
    );
}
