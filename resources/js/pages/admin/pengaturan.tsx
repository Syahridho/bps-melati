import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, LoaderCircle, Save, UserCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface SettingPageProps extends SharedData {
    settings: {
        nama_penanda_tangan: string;
        jabatan_penanda_tangan: string;
        kota_penanda_tangan: string;
    };
    flash: {
        success?: string;
    };
}

export default function Pengaturan() {
    const { settings, flash } = usePage<SettingPageProps>().props;
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        nama_penanda_tangan: settings?.nama_penanda_tangan || '',
        jabatan_penanda_tangan: settings?.jabatan_penanda_tangan || 'KETUA TIM PENGADUAN',
        kota_penanda_tangan: settings?.kota_penanda_tangan || 'Pekanbaru',
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
        post(route('dashboard.admin.pengaturan.update'));
    };

    return (
        <AdminPage
            title="Pengaturan Aplikasi"
            description="Kelola pengaturan aplikasi dan informasi penanda tangan rekap secara dinamis"
            breadcrumbs={[{ title: 'Pengaturan', href: route('dashboard.admin.pengaturan.index') }]}
        >
            <div className="max-w-4xl space-y-6">
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <UserCheck className="h-5 w-5 text-primary" />
                                Penanda Tangan Rekap & Laporan
                            </CardTitle>
                            <CardDescription>
                                Pengaturan nama dan informasi pejabat penanda tangan yang akan tercetak secara dinamis pada rekap laporan (Bulanan, Semesteran, Tahunan).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nama_penanda_tangan">
                                    Nama Penanda Tangan <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="nama_penanda_tangan"
                                    placeholder="Masukkan nama lengkap beserta gelar (contoh: Drs. Ahmad, M.Si)"
                                    value={data.nama_penanda_tangan}
                                    onChange={(e) => setData('nama_penanda_tangan', e.target.value)}
                                />
                                {errors.nama_penanda_tangan && (
                                    <p className="text-xs text-destructive">{errors.nama_penanda_tangan}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Nilai ini disimpan ke Redis cache 24 jam/30 hari dan langsung digunakan pada lembar cetak laporan rekap.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="jabatan_penanda_tangan">Jabatan Penanda Tangan</Label>
                                    <Input
                                        id="jabatan_penanda_tangan"
                                        placeholder="contoh: KETUA TIM PENGADUAN"
                                        value={data.jabatan_penanda_tangan}
                                        onChange={(e) => setData('jabatan_penanda_tangan', e.target.value)}
                                    />
                                    {errors.jabatan_penanda_tangan && (
                                        <p className="text-xs text-destructive">{errors.jabatan_penanda_tangan}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="kota_penanda_tangan">Kota Cetak Laporan</Label>
                                    <Input
                                        id="kota_penanda_tangan"
                                        placeholder="contoh: Pekanbaru"
                                        value={data.kota_penanda_tangan}
                                        onChange={(e) => setData('kota_penanda_tangan', e.target.value)}
                                    />
                                    {errors.kota_penanda_tangan && (
                                        <p className="text-xs text-destructive">{errors.kota_penanda_tangan}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} className="gap-2">
                            {processing ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Simpan Pengaturan
                        </Button>
                    </div>
                </form>
            </div>
        </AdminPage>
    );
}
