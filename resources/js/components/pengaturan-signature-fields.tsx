import HeadingSmall from '@/components/heading-small';
import { PengaturanFormField } from '@/components/pengaturan-form-field';
import { type SetSettingField, type SettingValues } from '@/types/pengaturan';

interface PengaturanSignatureFieldsProps {
    data: SettingValues;
    setData: SetSettingField;
    errors: Partial<Record<keyof SettingValues, string>>;
}

export function PengaturanSignatureFields({ data, setData, errors }: PengaturanSignatureFieldsProps) {
    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Penanda Tangan Rekap & Laporan"
                description="Pengaturan nama dan informasi pejabat penanda tangan yang akan tercetak secara dinamis pada rekap laporan."
            />

            <PengaturanFormField
                id="nama_penanda_tangan"
                label="Nama Penanda Tangan"
                required
                placeholder="Masukkan nama lengkap beserta gelar (contoh: Drs. Ahmad, M.Si)"
                hint="Nilai ini langsung digunakan pada lembar cetak laporan rekap bulanan, semesteran, dan tahunan."
                value={data.nama_penanda_tangan}
                onChange={(value) => setData('nama_penanda_tangan', value)}
                error={errors.nama_penanda_tangan}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <PengaturanFormField
                    id="jabatan_penanda_tangan"
                    label="Jabatan Penanda Tangan"
                    placeholder="contoh: KETUA TIM PENGADUAN"
                    value={data.jabatan_penanda_tangan}
                    onChange={(value) => setData('jabatan_penanda_tangan', value)}
                    error={errors.jabatan_penanda_tangan}
                />

                <PengaturanFormField
                    id="kota_penanda_tangan"
                    label="Kota Cetak Laporan"
                    placeholder="contoh: Pekanbaru"
                    value={data.kota_penanda_tangan}
                    onChange={(value) => setData('kota_penanda_tangan', value)}
                    error={errors.kota_penanda_tangan}
                />
            </div>
        </div>
    );
}
