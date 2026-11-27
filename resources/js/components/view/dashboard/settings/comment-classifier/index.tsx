import InputError from '@/components/atoms/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, router, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CommentClassifierRules {
    min_length?: number;
    min_words?: number;
    fallback_when_uncertain?: boolean;
    keywords?: {
        pengaduan?: unknown;
        aspirasi?: unknown;
        permintaan_informasi?: unknown;
    };
    ignore?: unknown;
    abbreviations?: unknown;
    priority?: unknown;
}

const toList = (v: unknown): string[] => {
    if (Array.isArray(v)) {
        return v.map((x) => String(x));
    }
    if (v && typeof v === 'object') {
        return Object.values(v as Record<string, unknown>).map((x) => String(x));
    }
    return [];
};

export default function CommentClassifierSettingsView() {
    const { rules: rawRules, errors } = usePage<{ rules?: CommentClassifierRules; errors?: Record<string, string> }>().props;
    const rules = rawRules;
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
    const [testResult, setTestResult] = useState<{ jenis: string; alasan: string; teks_normal: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [abbrError, setAbbrError] = useState('');
    const savingRef = useRef(false);

    useEffect(() => {
        const removeInvalid = router.on('invalid', () => {
            if (!savingRef.current) return;
            toast.error('Terjadi kesalahan pada server. Silakan coba lagi.');
        });
        const removeException = router.on('exception', () => {
            if (!savingRef.current) return;
            toast.error('Gagal menghubungi server. Periksa koneksi jaringan Anda dan coba lagi.');
        });

        return () => {
            removeInvalid();
            removeException();
        };
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Klasifikasi Komentar', href: route('settings.comment-classifier.index') }];

    const fieldError = (key: string): string | undefined =>
        errors?.[key] ?? Object.entries(errors ?? {}).find(([k]) => k.startsWith(`${key}.`))?.[1];

    const splitList = (v: string) =>
        v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    const handleSave = () => {
        if (processing || resetting) return;
        setProcessing(true);
        setAbbrError('');
        let abbr: Record<string, FormDataConvertible> = {};
        try {
            abbr = abbreviations.trim() === '' ? {} : JSON.parse(abbreviations);
        } catch {
            setAbbrError('Singkatan (JSON) tidak valid. Perbaiki format JSON sebelum menyimpan.');
            toast.error('Gagal menyimpan. Periksa kembali isian Anda.');
            setProcessing(false);
            return;
        }
        if (typeof abbr !== 'object' || abbr === null || Array.isArray(abbr)) {
            setAbbrError('Singkatan (JSON) harus berupa objek.');
            toast.error('Gagal menyimpan. Periksa kembali isian Anda.');
            setProcessing(false);
            return;
        }
        savingRef.current = true;
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
                onSuccess: () => {
                    toast.success('Pengaturan klasifikasi komentar berhasil disimpan.');
                },
                onError: () => {
                    toast.error('Gagal menyimpan. Periksa kembali isian Anda.');
                },
                onFinish: () => {
                    savingRef.current = false;
                    setProcessing(false);
                },
            },
        );
    };

    const handleReset = () => {
        if (processing || resetting) return;
        setResetting(true);
        savingRef.current = true;
        router.post(
            route('settings.comment-classifier.reset'),
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const nextRules = (page.props as { rules?: CommentClassifierRules }).rules;
                    if (nextRules) {
                        setMinLength(nextRules.min_length ?? 10);
                        setMinWords(nextRules.min_words ?? 3);
                        setFallback(!!nextRules.fallback_when_uncertain);
                        setPengaduan(toList(nextRules.keywords?.pengaduan).join(', '));
                        setAspirasi(toList(nextRules.keywords?.aspirasi).join(', '));
                        setPermintaan(toList(nextRules.keywords?.permintaan_informasi).join(', '));
                        setIgnore(toList(nextRules.ignore).join(', '));
                        setAbbreviations(JSON.stringify(nextRules.abbreviations ?? {}, null, 2));
                        setPriority(toList(nextRules.priority ?? ['pengaduan', 'aspirasi', 'permintaan_informasi']).join(', '));
                    }
                    setAbbrError('');
                    toast.success('Aturan klasifikasi dikembalikan ke default.');
                },
                onError: () => {
                    toast.error('Gagal mengembalikan pengaturan ke default.');
                },
                onFinish: () => {
                    savingRef.current = false;
                    setResetting(false);
                },
            },
        );
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Aturan</CardTitle>
                            <CardDescription>Pisahkan kata dengan koma.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Panjang minimum (karakter)</Label>
                                    <Input type="number" value={minLength} onChange={(e) => setMinLength(Number(e.target.value))} />
                                    <InputError message={fieldError('min_length')} />
                                </div>
                                <div>
                                    <Label>Jumlah kata minimum</Label>
                                    <Input type="number" value={minWords} onChange={(e) => setMinWords(Number(e.target.value))} />
                                    <InputError message={fieldError('min_words')} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={fallback} onCheckedChange={setFallback} />
                                <Label>Simpan sebagai default jika ragu</Label>
                            </div>
                            <div>
                                <Label>Kata kunci Pengaduan</Label>
                                <Textarea value={pengaduan} onChange={(e) => setPengaduan(e.target.value)} />
                                <InputError message={fieldError('keywords.pengaduan')} />
                            </div>
                            <div>
                                <Label>Kata kunci Aspirasi</Label>
                                <Textarea value={aspirasi} onChange={(e) => setAspirasi(e.target.value)} />
                                <InputError message={fieldError('keywords.aspirasi')} />
                            </div>
                            <div>
                                <Label>Kata kunci Permintaan Informasi</Label>
                                <Textarea value={permintaan} onChange={(e) => setPermintaan(e.target.value)} />
                                <InputError message={fieldError('keywords.permintaan_informasi')} />
                            </div>
                            <div>
                                <Label>Daftar abaikan</Label>
                                <Textarea value={ignore} onChange={(e) => setIgnore(e.target.value)} />
                                <InputError message={fieldError('ignore')} />
                            </div>
                            <div>
                                <Label>Singkatan (JSON)</Label>
                                <Textarea value={abbreviations} onChange={(e) => setAbbreviations(e.target.value)} />
                                <InputError message={abbrError || fieldError('abbreviations')} />
                            </div>
                            <div>
                                <Label>Prioritas (koma)</Label>
                                <Input value={priority} onChange={(e) => setPriority(e.target.value)} />
                                <InputError message={fieldError('priority')} />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={processing || resetting}>
                                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                                <Button variant="outline" onClick={handleReset} disabled={processing || resetting}>
                                    {resetting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    {resetting ? 'Mengembalikan...' : 'Kembalikan ke default'}
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
