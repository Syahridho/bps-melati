import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Head, router, usePage } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { Copy, Download, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';

interface AndroidRelease {
    id: number;
    version: string;
    release_notes: string | null;
    original_name: string;
    size_bytes: number;
    checksum_sha256: string;
    uploaded_at: string | null;
    uploaded_by: string | null;
    download_count: number;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default function AndroidSettingsView() {
    const { release, flash } = usePage<{ release: AndroidRelease | null; flash?: { success?: string } }>().props;

    const { data, setData, post, processing, errors, progress, reset } = useForm({
        apk: null as File | null,
        version: '',
        release_notes: '',
    });

    const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            setSelectedFile(file);
            setData('apk', file);
        }
    };

    const doUpload = () => {
        post(route('settings.android.store'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('APK berhasil diunggah.');
                reset();
                setSelectedFile(null);
            },
            onError: () => {
                toast.error('Gagal mengunggah APK. Periksa kembali data Anda.');
            },
        });
    };

    const handleUploadClick = () => {
        if (!data.apk) {
            toast.error('Pilih file APK terlebih dahulu.');
            return;
        }
        if (release) {
            setConfirmReplaceOpen(true);
        } else {
            doUpload();
        }
    };

    const handleDelete = () => {
        if (!release) return;
        router.delete(route('settings.android.destroy', release.id), {
            onSuccess: () => {
                toast.success('APK berhasil dihapus.');
                setConfirmDeleteOpen(false);
            },
            onError: () => {
                toast.error('Gagal menghapus APK.');
            },
        });
    };

    const copyChecksum = async () => {
        if (!release?.checksum_sha256) return;
        try {
            await navigator.clipboard.writeText(release.checksum_sha256);
            toast.success('Checksum disalin.');
        } catch {
            toast.error('Gagal menyalin checksum.');
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Aplikasi Android', href: route('settings.android') }];

    const uploadProgress = progress?.percentage ?? 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Aplikasi Android" />
            <SettingsLayout title="Aplikasi Android" description="Unggah file APK yang akan tersedia untuk diunduh di halaman utama.">
                <div className="space-y-6">
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                            {flash.success}
                        </div>
                    )}

                    {/* Kartu APK saat ini */}
                    <Card>
                        <CardHeader>
                            <CardTitle>APK saat ini</CardTitle>
                            <CardDescription>Informasi rilis APK yang aktif.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!release ? (
                                <p className="text-muted-foreground text-sm">Belum ada APK diunggah.</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                        <div>
                                            <span className="text-muted-foreground">Nama file:</span>{' '}
                                            <span className="font-medium">{release.original_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Versi:</span>{' '}
                                            <span className="font-medium">{release.version}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Ukuran:</span>{' '}
                                            <span className="font-medium">{formatBytes(release.size_bytes)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Tanggal unggah:</span>{' '}
                                            <span className="font-medium">{formatDate(release.uploaded_at)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Pengunggah:</span>{' '}
                                            <span className="font-medium">{release.uploaded_by ?? '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Jumlah unduhan:</span>{' '}
                                            <span className="font-medium">{release.download_count}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground text-xs">SHA-256</span>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-muted flex-1 truncate rounded px-2 py-1 text-xs">{release.checksum_sha256}</code>
                                            <Button variant="outline" size="sm" onClick={copyChecksum}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={route('android.download')} download>
                                                <Download className="mr-2 h-4 w-4" />
                                                Unduh
                                            </a>
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Form unggah */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Unggah APK baru</CardTitle>
                            <CardDescription>Maksimal 10 MB, format .apk</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="apk">File APK</Label>
                                <Input
                                    id="apk"
                                    type="file"
                                    accept=".apk,application/vnd.android.package-archive"
                                    onChange={handleFileChange}
                                />
                                {selectedFile && (
                                    <p className="text-muted-foreground text-xs">{selectedFile.name}</p>
                                )}
                                {errors.apk && <p className="text-destructive text-xs">{errors.apk}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="version">Versi</Label>
                                <Input
                                    id="version"
                                    value={data.version}
                                    onChange={(e) => setData('version', e.target.value)}
                                    placeholder="1.0.0"
                                    maxLength={20}
                                />
                                {errors.version && <p className="text-destructive text-xs">{errors.version}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="release_notes">Catatan rilis (opsional)</Label>
                                <Textarea
                                    id="release_notes"
                                    value={data.release_notes}
                                    onChange={(e) => setData('release_notes', e.target.value)}
                                    maxLength={500}
                                    rows={3}
                                />
                                {errors.release_notes && <p className="text-destructive text-xs">{errors.release_notes}</p>}
                            </div>

                            {processing && (
                                <div className="space-y-1">
                                    <div className="bg-muted h-2 w-full overflow-hidden rounded">
                                        <div className="bg-primary h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                    <p className="text-muted-foreground text-xs">{uploadProgress}%</p>
                                </div>
                            )}

                            <Button onClick={handleUploadClick} disabled={processing}>
                                {processing ? 'Mengunggah...' : 'Unggah APK'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Dialog konfirmasi ganti */}
                <Dialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ganti APK yang sudah ada?</DialogTitle>
                            <DialogDescription>
                                APK lama akan diganti dengan yang baru. Tindakan ini tidak dapat dibatalkan.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmReplaceOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => {
                                    setConfirmReplaceOpen(false);
                                    doUpload();
                                }}
                            >
                                Ganti
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog konfirmasi hapus */}
                <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus APK?</DialogTitle>
                            <DialogDescription>
                                APK aktif akan dihapus dan tidak lagi tersedia untuk diunduh.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    );
}
