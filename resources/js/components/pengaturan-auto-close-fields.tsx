import HeadingSmall from '@/components/heading-small';
import { PengaturanFormField } from '@/components/pengaturan-form-field';
import { type SetSettingField, type SettingValues } from '@/types/pengaturan';

interface PengaturanAutoCloseFieldsProps {
    data: SettingValues;
    setData: SetSettingField;
    errors: Partial<Record<keyof SettingValues, string>>;
}

export function PengaturanAutoCloseFields({ data, setData, errors }: PengaturanAutoCloseFieldsProps) {
    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Batas Waktu Otomatis Selesai (Auto Close)"
                description="Jumlah hari tanpa balasan dari pelapor setelah petugas memberikan respon sebelum tiket secara otomatis ditandai selesai. Isi 0 untuk menonaktifkan."
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <PengaturanFormField
                    id="auto_close_pengaduan_days"
                    label="Pengaduan (Hari)"
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={data.auto_close_pengaduan_days}
                    onChange={(value) => setData('auto_close_pengaduan_days', value)}
                    error={errors.auto_close_pengaduan_days}
                />

                <PengaturanFormField
                    id="auto_close_aspirasi_days"
                    label="Aspirasi (Hari)"
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={data.auto_close_aspirasi_days}
                    onChange={(value) => setData('auto_close_aspirasi_days', value)}
                    error={errors.auto_close_aspirasi_days}
                />

                <PengaturanFormField
                    id="auto_close_permintaan_informasi_days"
                    label="Permintaan Info (Hari)"
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={data.auto_close_permintaan_informasi_days}
                    onChange={(value) => setData('auto_close_permintaan_informasi_days', value)}
                    error={errors.auto_close_permintaan_informasi_days}
                />
            </div>

            <div className="max-w-xs">
                <PengaturanFormField
                    id="kadar_pengawasan_hari"
                    label="Kadar Pengawasan (Hari)"
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={data.kadar_pengawasan_hari}
                    onChange={(value) => setData('kadar_pengawasan_hari', value)}
                    error={errors.kadar_pengawasan_hari}
                    hint="Jumlah hari sebagai batas kadar pengawasan tiket. Default 30 hari."
                />
            </div>
        </div>
    );
}
