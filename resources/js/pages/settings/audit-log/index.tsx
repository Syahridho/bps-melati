import { useEcho } from '@laravel/echo-react';
import axios from 'axios';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthRole } from '@/hooks/use-auth-role';
import AppLayout from '@/layouts/app-layout';
import { FlagsSkeleton, LogsSkeleton, SummarySkeleton } from './audit-log-skeletons';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

type Severity = 'info' | 'notice' | 'warning';
type TabKey = 'logs' | 'flags' | 'summary';

interface AuditLog {
    id: number;
    event_type: string;
    category: string;
    severity: Severity;
    actor_name: string | null;
    actor_role: string | null;
    ticket_number: string | null;
    ip: string | null;
    created_at: string;
}

interface AuditFlag {
    id: number;
    type: string;
    severity: Severity;
    status: 'baru' | 'ditinjau' | 'wajar' | 'tindak_lanjut';
    ticket_id?: number | null;
    ticket_number?: string | null;
    review_note?: string | null;
    details: {
        tingkat?: 'tinggi' | 'sedang' | 'rendah';
        petugas_nama?: string;
        reporter_ip?: string;
        pic_ip?: string;
        catatan?: string;
    };
    created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Pengaturan',
        href: route('settings.application.penugasan'),
    },
];

const severityVariant = (s: Severity) => (s === 'warning' ? 'destructive' : s === 'notice' ? 'secondary' : 'default');

function LoadingBox() {
    return <div className="border-border/30 h-64 w-full animate-pulse rounded-md border" />;
}

function ErrorBox({ message }: { message: string }) {
    return <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">{message}</div>;
}

export default function AuditLogPage() {
    const { isAdmin } = useAuthRole();

    const [activeTab, setActiveTab] = useState<TabKey>('logs');

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [flags, setFlags] = useState<AuditFlag[]>([]);
    const [summary, setSummary] = useState<any>(null);

    const [loadingLogs, setLoadingLogs] = useState(true);
    const [loadingFlags, setLoadingFlags] = useState(true);
    const [loadingSummary, setLoadingSummary] = useState(true);

    const [logsError, setLogsError] = useState<string | null>(null);
    const [flagsError, setFlagsError] = useState<string | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    const [auditLogBadge, setAuditLogBadge] = useState(0);

    // Filter state
    const [categoryFilter, setCategoryFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [flagTypeFilter, setFlagTypeFilter] = useState('');
    const [flagStatusFilter, setFlagStatusFilter] = useState('baru');

    // ---------- Fetchers ----------
    // silent = true untuk polling, supaya tabel tidak berkedip jadi skeleton
    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoadingLogs(true);
        try {
            const response = await axios.get(route('audit-log.index'), {
                params: { per_page: 50 },
            });
            setLogs(response.data.logs ?? []);
            setLogsError(null);
        } catch (e) {
            setLogsError('Gagal memuat log audit');
            console.error(e);
        } finally {
            if (!silent) setLoadingLogs(false);
        }
    }, []);

    const fetchFlags = useCallback(async (silent = false) => {
        if (!silent) setLoadingFlags(true);
        try {
            const response = await axios.get(route('audit-flag.index'), {
                params: flagStatusFilter ? { status: flagStatusFilter } : {},
            });
            setFlags(response.data.flags ?? []);
            setFlagsError(null);
        } catch (e) {
            setFlagsError('Gagal memuat penanda');
            console.error(e);
        } finally {
            if (!silent) setLoadingFlags(false);
        }
    }, [flagStatusFilter]);

    const fetchSummary = useCallback(async (silent = false) => {
        if (!silent) setLoadingSummary(true);
        try {
            const response = await axios.get(route('audit-log.summary-weekly'));
            setSummary(response.data);
            setSummaryError(null);
        } catch (e) {
            setSummaryError('Gagal memuat ringkasan');
            console.error(e);
        } finally {
            if (!silent) setLoadingSummary(false);
        }
    }, []);

    // ---------- Real-time (HOOK HARUS DI BODY KOMPONEN, BUKAN DI DALAM useEffect) ----------
    useEcho(isAdmin ? 'audit.log' : '', '.audit.log.created', (event: any) => {
        const newLog: AuditLog = {
            id: event.id,
            event_type: event.event_type,
            category: event.category,
            severity: event.severity || 'info',
            actor_name: event.actor_name || null,
            actor_role: event.actor_role || null,
            ticket_number: event.ticket_number ?? (event.ticket_id ? `#${event.ticket_id}` : null),
            ip: event.ip || null,
            created_at: event.created_at || new Date().toISOString(),
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
        setAuditLogBadge((prev) => prev + 1);
    }, [isAdmin]);

    // ---------- Initial load + polling fallback ----------
    useEffect(() => {
        if (!isAdmin) return;

        fetchLogs();
        fetchSummary();

        const intervalId = setInterval(() => fetchLogs(true), 15000);
        return () => clearInterval(intervalId);
    }, [isAdmin, fetchLogs, fetchSummary]);

    // Flags di-fetch ulang saat filter status berubah
    useEffect(() => {
        if (!isAdmin) return;
        fetchFlags();
    }, [isAdmin, fetchFlags]);

    // Saat pindah tab, perbarui data yang sudah pernah dimuat secara diam-diam
    useEffect(() => {
        if (!isAdmin) return;
        if (activeTab === 'logs') fetchLogs(true);
        if (activeTab === 'flags') fetchFlags(true);
        if (activeTab === 'summary') fetchSummary(true);
    }, [activeTab, isAdmin]);

    // ---------- Derived data ----------
    const filteredLogs = useMemo(
        () => logs.filter((l) => (!categoryFilter || l.category === categoryFilter) && (!severityFilter || l.severity === severityFilter)),
        [logs, categoryFilter, severityFilter],
    );

    const filteredFlags = useMemo(() => flags.filter((f) => !flagTypeFilter || f.type === flagTypeFilter), [flags, flagTypeFilter]);

    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewGroup, setReviewGroup] = useState<any>(null);
    const [reviewStatus, setReviewStatus] = useState('ditinjau');
    const [reviewNote, setReviewNote] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const levelRank: Record<string, number> = { rendah: 1, sedang: 2, tinggi: 3 };
    const raiseLevel = (level: string) => (level === 'rendah' ? 'sedang' : level === 'sedang' ? 'tinggi' : 'tinggi');

    const groupedFlags = useMemo(() => {
        const groups = new Map<string, any>();
        for (const flag of filteredFlags) {
            const key = flag.ticket_id != null ? `ticket-${flag.ticket_id}` : `flag-${flag.id}`;
            if (!groups.has(key)) {
                groups.set(key, { key, ticket_id: flag.ticket_id, ticket_number: flag.ticket_number, flags: [] as any[] });
            }
            groups.get(key).flags.push(flag);
        }
        return Array.from(groups.values()).map((g) => {
            const types = Array.from(new Set(g.flags.map((f: any) => f.type)));
            let tingkat = g.flags.reduce((max: string, f: any) => {
                const t = f.details?.tingkat ?? 'rendah';
                return (levelRank[t] ?? 0) > (levelRank[max] ?? 0) ? t : max;
            }, 'rendah');
            if (types.length >= 2) {
                tingkat = raiseLevel(tingkat);
            }
            const severity = g.flags.reduce((max: string, f: any) => {
                const sevRank: Record<string, number> = { info: 1, notice: 2, warning: 3 };
                return (sevRank[f.severity] ?? 0) > (sevRank[max] ?? 0) ? f.severity : max;
            }, 'info');
            return {
                ...g,
                types,
                tingkat,
                severity,
                representative: g.flags[0],
                created_at: g.flags.reduce((latest: string, f: any) => (new Date(f.created_at) > new Date(latest) ? f.created_at : latest), g.flags[0].created_at),
            };
        });
    }, [filteredFlags]);

    const openReview = (group: any) => {
        setReviewGroup(group);
        setReviewStatus(group.representative?.status && group.representative.status !== 'baru' ? group.representative.status : 'ditinjau');
        setReviewNote(group.representative?.review_note ?? '');
        setReviewError(null);
        setReviewOpen(true);
    };

    const handleReviewSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!reviewGroup) return;
        setSavingReview(true);
        setReviewError(null);
        try {
            await axios.patch(route('audit-flag.update', { flag: reviewGroup.representative.id }), {
                status: reviewStatus,
                note: reviewNote,
            });
            setFlags((prev) =>
                prev.map((f) =>
                    reviewGroup.flags.some((gf: any) => gf.id === f.id)
                        ? { ...f, status: reviewStatus as AuditFlag['status'], review_note: reviewNote }
                        : f,
                ),
            );
            setReviewOpen(false);
            fetchFlags(true);
            fetchSummary(true);
        } catch (err) {
            setReviewError('Gagal menyimpan penanda');
            console.error(err);
        } finally {
            setSavingReview(false);
        }
    };

    const FLAG_TYPE_LABELS: Record<string, string> = {
        jaringan_sama: 'Jaringan Sama',
        rating_cepat: 'Rating Cepat',
        rating_beruntun_ip: 'Rating Beruntun IP',
        selesai_cepat_setelah_balasan: 'Selesai Cepat Setelah Balasan',
        perangkat_sama: 'Perangkat Sama',
        penyelesaian_tidak_wajar: 'Penyelesaian Tidak Wajar',
        login_gagal_berulang: 'Login Gagal Berulang',
        login_baru: 'Login Baru',
        ekspor_sensitif: 'Ekspor Sensitif',
        perubahan_pengaturan_kritis: 'Perubahan Pengaturan Kritis',
    };

    if (!isAdmin) {
        return null;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Aplikasi" />
            <div className="space-y-4">
                {/* Tabs Navigation */}
                <div className="border-border flex border-b px-4 pb-2">
                    <Tabs defaultValue="logs" onValueChange={(v) => setActiveTab(v as TabKey)}>
                        <TabsList>
                            <TabsTrigger value="logs">Log Langsung</TabsTrigger>
                            <TabsTrigger value="flags">Penanda</TabsTrigger>
                            <TabsTrigger value="summary">Ringkasan</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* ===== Log Langsung ===== */}
                {activeTab === 'logs' && (
                    <div className="space-y-4">
                        {loadingLogs ? (
                            <LogsSkeleton />
                        ) : logsError ? (
                            <ErrorBox message={logsError} />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                                    <select
                                        className="border-border focus:ring-primary flex-1 rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                    >
                                        <option value="">Semua Kategori</option>
                                        <option value="ticket">Ticket</option>
                                        <option value="auth">Autentikasi</option>
                                        <option value="setting">Pengaturan</option>
                                        <option value="user">Pengguna</option>
                                        <option value="export">Ekspor</option>
                                    </select>
                                    <select
                                        className="border-border focus:ring-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                                        value={severityFilter}
                                        onChange={(e) => setSeverityFilter(e.target.value)}
                                    >
                                        <option value="">Semua Severity</option>
                                        <option value="info">Info</option>
                                        <option value="notice">Notice</option>
                                        <option value="warning">Warning</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setAuditLogBadge(0);
                                            fetchLogs();
                                        }}
                                        disabled={loadingLogs}
                                    >
                                        Refresh
                                    </Button>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-20">Waktu</TableHead>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Severity</TableHead>
                                            <TableHead>Actor</TableHead>
                                            <TableHead>Ticket</TableHead>
                                            <TableHead>IP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{format(new Date(log.created_at), 'dd MMM HH:mm')}</TableCell>
                                                <TableCell>{log.category}</TableCell>
                                                <TableCell>{log.event_type}</TableCell>
                                                <TableCell>
                                                    <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
                                                </TableCell>
                                                <TableCell>{log.actor_name || 'N/A'}</TableCell>
                                                <TableCell>{log.ticket_number || '-'}</TableCell>
                                                <TableCell>{log.ip || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredLogs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                                                    Tidak ada log audit
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {filteredLogs.length > 0 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-muted-foreground text-sm">Menampilkan {filteredLogs.length} log audit terakhir</span>
                                        <span className="text-muted-foreground text-xs">
                                            Real-time: {auditLogBadge > 0 ? `${auditLogBadge} baru` : 'Up to date'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== Penanda ===== */}
                {activeTab === 'flags' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                            <select
                                className="border-border focus:ring-primary flex-1 rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                                value={flagTypeFilter}
                                onChange={(e) => setFlagTypeFilter(e.target.value)}
                            >
                                <option value="">Semua Tipe</option>
                                <option value="jaringan_sama">Jaringan Sama</option>
                                <option value="rating_cepat">Rating Cepat</option>
                                <option value="rating_beruntun_ip">Rating Beruntun IP</option>
                                <option value="selesai_cepat_setelah_balasan">Selesai Cepat Setelah Balasan</option>
                            </select>
                            <select
                                className="border-border focus:ring-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                                value={flagStatusFilter}
                                onChange={(e) => setFlagStatusFilter(e.target.value)}
                            >
                                <option value="">Semua Status</option>
                                <option value="baru">Baru</option>
                                <option value="ditinjau">Ditinjau</option>
                            </select>
                        </div>

                        {loadingFlags ? (
                            <FlagsSkeleton />
                        ) : flagsError ? (
                            <ErrorBox message={flagsError} />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Severity</TableHead>
                                        <TableHead>Tiket</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Petugas</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedFlags.map((group) => (
                                        <TableRow key={group.key} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.types.map((t: string) => (
                                                        <Badge key={t} variant="outline">{FLAG_TYPE_LABELS[t] ?? t}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {group.tingkat === 'tinggi' ? (
                                                    <Badge variant="destructive">Tinggi</Badge>
                                                ) : group.tingkat === 'sedang' ? (
                                                    <Badge variant="secondary">Sedang</Badge>
                                                ) : (
                                                    <Badge variant="default">Rendah</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{group.ticket_number || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{group.representative.status}</Badge>
                                            </TableCell>
                                            <TableCell>{group.representative.details?.petugas_nama || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" aria-label="Review flag" onClick={() => openReview(group)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {groupedFlags.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                                Tidak ada penanda
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}

                {/* ===== Ringkasan ===== */}
                {activeTab === 'summary' && (
                    <div className="space-y-4">
                        {loadingSummary ? (
                            <SummarySkeleton />
                        ) : summaryError ? (
                            <ErrorBox message={summaryError} />
                        ) : !summary ? (
                            <p className="text-muted-foreground">Tidak ada data ringkasan.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="border-border/30 bg-card rounded-md border p-4">
                                    <p className="text-muted-foreground text-sm">Log Audit Mingguan</p>
                                    <p className="text-2xl font-medium">{summary.logs_this_week ?? 0}</p>
                                </div>
                                <div className="border-border/30 bg-card rounded-md border p-4">
                                    <p className="text-muted-foreground text-sm">Penanda Baru</p>
                                    <p className="text-2xl font-medium">{summary.new_flags_this_week ?? 0}</p>
                                </div>
                                <div className="border-border/30 bg-card rounded-md border p-4">
                                    <p className="text-muted-foreground text-sm">Flag Sudah Ditinjau</p>
                                    <p className="text-2xl font-medium">{summary.reviewed_count ?? 0}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Review Penanda</DialogTitle>
                        <DialogDescription>
                            {reviewGroup?.ticket_number ? (
                                <a href={`/dashboard/admin/incoming-reports/${reviewGroup.ticket_number}`} className="text-primary underline">
                                    {reviewGroup.ticket_number}
                                </a>
                            ) : (
                                'Detail penanda'
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {reviewGroup && (
                        <div className="space-y-3 text-sm">
                            <div className="bg-muted/40 space-y-1 rounded-md border p-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Jenis:</span>
                                    <span className="font-medium">
                                        {reviewGroup.types.map((t: string) => FLAG_TYPE_LABELS[t] ?? t).join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tingkat:</span>
                                    <span className="font-medium">{reviewGroup.tingkat}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Severity:</span>
                                    <span className="font-medium">{reviewGroup.severity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Petugas (PIC):</span>
                                    <span className="font-medium">{reviewGroup.representative.details?.petugas_nama || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IP Pelapor:</span>
                                    <span className="font-medium">{reviewGroup.representative.details?.reporter_ip || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IP PIC:</span>
                                    <span className="font-medium">{reviewGroup.representative.details?.pic_ip || 'N/A'}</span>
                                </div>
                                {reviewGroup.representative.details?.selisih_detik != null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Selisih (detik):</span>
                                        <span className="font-medium">{reviewGroup.representative.details.selisih_detik}</span>
                                    </div>
                                )}
                                {reviewGroup.representative.details?.panjang_balasan != null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Panjang balasan:</span>
                                        <span className="font-medium">{reviewGroup.representative.details.panjang_balasan}</span>
                                    </div>
                                )}
                                {reviewGroup.representative.details?.rating != null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Rating:</span>
                                        <span className="font-medium">{reviewGroup.representative.details.rating}/5</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Waktu dibuat:</span>
                                    <span className="font-medium">{format(new Date(reviewGroup.created_at), 'dd MMM yyyy HH:mm')}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs font-semibold">Alasan sistem:</p>
                                {reviewGroup.flags.map((f: any) => (
                                    <p key={f.id} className="text-xs">• {f.details?.catatan || FLAG_TYPE_LABELS[f.type] || f.type}</p>
                                ))}
                            </div>

                            <form onSubmit={handleReviewSubmit} className="space-y-3 pt-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Status</label>
                                    <select
                                        className="border-border focus:ring-primary w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                                        value={reviewStatus}
                                        onChange={(e) => setReviewStatus(e.target.value)}
                                    >
                                        <option value="ditinjau">Ditinjau</option>
                                        <option value="wajar">Wajar</option>
                                        <option value="tindak_lanjut">Tindak Lanjut</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Catatan admin</label>
                                    <Textarea
                                        rows={3}
                                        value={reviewNote}
                                        onChange={(e) => setReviewNote(e.target.value)}
                                        placeholder="Catatan tinjauan..."
                                    />
                                </div>
                                {reviewError && <p className="text-destructive text-xs">{reviewError}</p>}
                                <DialogFooter className="gap-2 pt-2 sm:gap-0">
                                    <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={savingReview}>
                                        {savingReview ? 'Menyimpan...' : 'Simpan'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
