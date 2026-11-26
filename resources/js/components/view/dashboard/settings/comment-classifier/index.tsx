import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const toList = (v: any): string[] => {
    if (Array.isArray(v)) {
        return v.map((x) => String(x));
    }
    if (v && typeof v === 'object') {
        return Object.values(v).map((x) => String(x));
    }
    return [];
};

export default function CommentClassifierSettingsView() {
    const { rules, flash } = usePage<any>().props;
    const [minLength, setMinLength] = useState(rules?.min_length ?? 10);
    const [minWords, setMinWords] = useState(rules?.min_words ?? 3);
    const [fallback, setFallback] = useState(!!rules?.fallback_when_uncertain);
    const [pengaduan, setPengaduan] = useState(toList(rules?.keywords?.pengaduan).join(', '));
    const [aspirasi, setAspirasi] = useState(toList(rules?.keywords?.aspirasi).join(', '));
    const [permintaan, setPermintaan] = useState(toList(rules?.keywords?.permintaan_informasi).join(', '));
    const [ignore, setIgnore] = useState(toList(rules?.ignore).join(', '));
    const [abbreviations, setAbbreviations] = useState(JSON.stringify(rules?.abbreviations ?? {}, null, 2));
    const [priority, setPriority] = useState(toList(rules?.priority ?? ['pengaduan', 'aspirasi', 'permintaan_informasi']).join(', '));
    const [testText, setTestText] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(flash?.success);
    const [abbrError, setAbbrError] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Klasifikasi Komentar', href: route('settings.comment-classifier.index') }];

    const splitList = (v: string) =>
        v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    const handleSave = () => {
        setProcessing(true);
        setAbbrError('');
        let abbr: any = {};
        try {
            abbr = abbreviations.trim() === '' ? {} : JSON.parse(abbreviations);
        } catch {
            setAbbrError('Singkatan (JSON) tidak valid. Perbaiki format JSON sebelum menyimpan.');
            setProcessing(false);
            return;
        }
        if (typeof abbr !== 'object' || abbr === null || Array.isArray(abbr)) {
            setAbbrError('Singkatan (JSON) harus berupa objek.');
            setProcessing(false);
            return;
        }
        router.post(
            route('settings.comment-classifier.update'),
            {
                min_length: Number(minLength),
                min_words: Number(minWords),
                fallback_when_uncertain: fallback,
                keywords: {
                    pengaduan: splitList(pengaduan),
                    aspirasi: splitList(aspirasi),
                    permintaan_informasi: splitList(permintaan),
                },
                ignore: splitList(ignore),
                abbreviations: abbr,
                priority: splitList(priority),
            },
            {
                preserveScroll: true,
                onSuccess: () => setProcessing(false),
                onError: () => setProcessing(false),
            },
        );
    };

    const handleReset = () => {
        router.post(route('settings.comment-classifier.reset'), {}, { preserveScroll: true });
    };

    const handleTest = async () => {
        setTestResult(null);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

            const res = await fetch(route('settings.comment-classifier.test'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ text: testText }),
            });

            if (!res.ok) {
                const msg =
                    res.status === 419
                        ? 'Sesi habis, muat ulang halaman lalu coba lagi.'
                        : res.status === 403
                          ? 'Anda tidak punya akses.'
                          : res.status === 422
                            ? 'Teks tidak valid.'
                            : `Gagal menguji (${res.status}).`;
                setTestResult({ jenis: 'error', alasan: msg, teks_normal: '' });
                return;
            }

            setTestResult(await res.json());
        } catch {
            setTestResult({ jenis: 'error', alasan: 'Tidak bisa terhubung ke server.', teks_normal: '' });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Klasifikasi Komentar" />
            <SettingsLayout title="Klasifikasi Komentar" description="Atur kata kunci klasifikasi komentar media sosial.">
                <div className="space-y-6">
                    {success && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Aturan</CardTitle>
                            <CardDescription>Pisahkan kata dengan koma.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Panjang minimum (karakter)</Label>
                                    <Input type="number" value={minLength} onChange={(e) => setMinLength(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Jumlah kata minimum</Label>
                                    <Input type="number" value={minWords} onChange={(e) => setMinWords(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={fallback} onCheckedChange={setFallback} />
                                <Label>Simpan sebagai default jika ragu</Label>
                            </div>
                            <div>
                                <Label>Kata kunci Pengaduan</Label>
                                <Textarea value={pengaduan} onChange={(e) => setPengaduan(e.target.value)} />
                            </div>
                            <div>
                                <Label>Kata kunci Aspirasi</Label>
                                <Textarea value={aspirasi} onChange={(e) => setAspirasi(e.target.value)} />
                            </div>
                            <div>
                                <Label>Kata kunci Permintaan Informasi</Label>
                                <Textarea value={permintaan} onChange={(e) => setPermintaan(e.target.value)} />
                            </div>
                            <div>
                                <Label>Daftar abaikan</Label>
                                <Textarea value={ignore} onChange={(e) => setIgnore(e.target.value)} />
                            </div>
                            <div>
                                <Label>Singkatan (JSON)</Label>
                                <Textarea value={abbreviations} onChange={(e) => setAbbreviations(e.target.value)} />
                                {abbrError && <p className="text-sm text-red-600">{abbrError}</p>}
                            </div>
                            <div>
                                <Label>Prioritas (koma)</Label>
                                <Input value={priority} onChange={(e) => setPriority(e.target.value)} />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={processing}>
                                    Simpan
                                </Button>
                                <Button variant="outline" onClick={handleReset}>
                                    Kembalikan ke default
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Uji Komentar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Textarea value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Ketik komentar..." />
                            <Button onClick={handleTest}>Uji</Button>
                            {testResult && (
                                <div className="rounded border p-3 text-sm">
                                    <div>Jenis: {String(testResult.jenis)}</div>
                                    <div>Alasan: {testResult.alasan}</div>
                                    <div>Teks normal: {testResult.teks_normal}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
