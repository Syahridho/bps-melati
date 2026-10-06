import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface SettingPageProps extends SharedData {
    settings: {
        nama_penanda_tangan: string;
        jabatan_penanda_tangan: string;
        kota_penanda_tangan: string;
        auto_close_pengaduan_days: string;
        auto_close_aspirasi_days: string;
        auto_close_permintaan_informasi_days: string;
    };
    flash: {
        success?: string;
    };
}

export default function Pengaturan() {
    const { auth, settings, flash } = usePage<SettingPageProps>().props;
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Pengaturan',
            href: route(`${routePrefix}.pengaturan.index`),
        },
    ];

    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        nama_penanda_tangan: settings?.nama_penanda_tangan || '',
        jabatan_penanda_tangan: settings?.jabatan_penanda_tangan || 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings?.kota_penanda_tangan || 'Pekanbaru',
        auto_close_pengaduan_days: settings?.auto_close_pengaduan_days || '3',
        auto_close_aspirasi_days: settings?.auto_close_aspirasi_days || '1',
        auto_close_permintaan_informasi_days: settings?.auto_close_permintaan_informasi_days || '5',
    });

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route(`${routePrefix}.pengaturan.update`));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Aplikasi" />

            <SettingsLayout
                title="Pengaturan"
                description="Kelola pengaturan aplikasi, batas waktu otomatis selesai, dan informasi penanda tangan rekap"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Auto Close */}
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Batas Waktu Otomatis Selesai (Auto Close)"
                            description="Jumlah hari tanpa balasan dari pelapor setelah petugas memberikan respon sebelum tiket secara otomatis ditandai selesai."
                        />

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="auto_close_pengaduan_days">
                                    Pengaduan (Hari) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="auto_close_pengaduan_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.auto_close_pengaduan_days}
                                    onChange={(e) => setData('auto_close_pengaduan_days', e.target.value)}
                                    required
                                />
                                <InputError message={errors.auto_close_pengaduan_days} />
                                <p className="text-muted-foreground text-xs">Default: 3 hari</p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="auto_close_aspirasi_days">
                                    Aspirasi (Hari) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="auto_close_aspirasi_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.auto_close_aspirasi_days}
                                    onChange={(e) => setData('auto_close_aspirasi_days', e.target.value)}
                                    required
                                />
                                <InputError message={errors.auto_close_aspirasi_days} />
                                <p className="text-muted-foreground text-xs">Default: 1 hari</p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="auto_close_permintaan_informasi_days">
                                    Permintaan Info (Hari) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="auto_close_permintaan_informasi_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.auto_close_permintaan_informasi_days}
                                    onChange={(e) => setData('auto_close_permintaan_informasi_days', e.target.value)}
                                    required
                                />
                                <InputError message={errors.auto_close_permintaan_informasi_days} />
                                <p className="text-muted-foreground text-xs">Default: 5 hari</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Section 2: Penanda Tangan */}
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Penanda Tangan Rekap & Laporan"
                            description="Pengaturan nama dan informasi pejabat penanda tangan yang akan tercetak secara dinamis pada rekap laporan."
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="nama_penanda_tangan">
                                Nama Penanda Tangan <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="nama_penanda_tangan"
                                placeholder="Masukkan nama lengkap beserta gelar (contoh: Drs. Ahmad, M.Si)"
                                value={data.nama_penanda_tangan}
                                onChange={(e) => setData('nama_penanda_tangan', e.target.value)}
                            />
                            <InputError message={errors.nama_penanda_tangan} />
                            <p className="text-muted-foreground text-xs">
                                Nilai ini langsung digunakan pada lembar cetak laporan rekap bulanan, semesteran, dan tahunan.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="jabatan_penanda_tangan">Jabatan Penanda Tangan</Label>
                                <Input
                                    id="jabatan_penanda_tangan"
                                    placeholder="contoh: KETUA TIM PENGADUAN"
                                    value={data.jabatan_penanda_tangan}
                                    onChange={(e) => setData('jabatan_penanda_tangan', e.target.value)}
                                />
                                <InputError message={errors.jabatan_penanda_tangan} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="kota_penanda_tangan">Kota Cetak Laporan</Label>
                                <Input
                                    id="kota_penanda_tangan"
                                    placeholder="contoh: Pekanbaru"
                                    value={data.kota_penanda_tangan}
                                    onChange={(e) => setData('kota_penanda_tangan', e.target.value)}
                                />
                                <InputError message={errors.kota_penanda_tangan} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <Button disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Pengaturan
                        </Button>

                        <Transition
                            show={recentlySuccessful || !!successMessage}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {successMessage || 'Tersimpan'}
                            </p>
                        </Transition>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
