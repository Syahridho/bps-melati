import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/molecules/scrollable-tabs';
import { useAuthRole } from '@/hooks/use-auth-role';
import { useEcho } from '@laravel/echo-react';
import { useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowLeft, Flag, Info, Calendar, Loader2, X, Eye } from 'lucide-react';

interface AuditLog {
  id: number;
  event_type: string;
  category: string;
  severity: 'info' | 'notice' | 'warning';
  actor_name: string | null;
  actor_role: string | null;
  ticket_number: string | null;
  ip: string | null;
  created_at: string;
}

interface AuditFlag {
  id: number;
  type: string;
  severity: 'info' | 'notice' | 'warning';
  status: 'baru' | 'ditinjau' | 'wajar' | 'tindak_lanjut';
  details: {
    tingkat?: 'tinggi' | 'sedang' | 'rendah';
    petugas_nama?: string;
    reporter_ip?: string;
    pic_ip?: string;
    catatan?: string;
  };
  created_at: string;

}

export default function AuditLogPage() {
  const { user, isAdmin } = useAuthRole();
  const { axios } = usePage().props as any;

  const [activeTab, setActiveTab] = useState<'logs' | 'flags' | 'summary'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLogBadge, setAuditLogBadge] = useState(0);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(route('audit-log.index'), {
        params: {
          per_page: 50,
        },
      });
      const data = response.data.logs ?? [];
      setLogs(data);
      setError(null);
    } catch (e: any) {
      setError('Gagal memuat log audit');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch flags
  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(route('audit-flag.index'), {
        params: {
          status: 'baru',
        },
      });
      const data = response.data.flags ?? [];
      setFlags(data);
      setError(null);
    } catch (e: any) {
      setError('Gagal memuat penanda');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(route('audit-log.summary-weekly'), {
        params: {},
      });
      setSummary(response.data);
      setError(null);
    } catch (e: any) {
      setError('Gagal memuat ringkasan');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    fetchLogs();
    fetchFlags();
    fetchSummary();

    // Real-time: Listen for new audit logs via Echo
    const logListener = useEcho(
      user?.role === 'admin' ? 'audit.log' : '',
      '.audit.log.created',
      (event: any) => {
        const newLog: AuditLog = {
          id: event.id,
          event_type: event.event_type,
          category: event.category,
          severity: event.severity || 'info',
          actor_name: event.actor_name || null,
          actor_role: event.actor_role || null,
          ticket_number: event.ticket_id ? `#${event.ticket_id}` : null,
          ip: event.ip || null,
          created_at: event.created_at || new Date().toISOString(),
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
        // Update badge count
        setAuditLogBadge(prev => prev + 1);
      }
    );

    // Poll every 15 seconds as fallback
    const intervalId = setInterval(() => {
      fetchLogs();
    }, 15000);

    return () => {
      logListener?.stopListening();
      clearInterval(intervalId);
    };
  }, [isAdmin, fetchLogs, fetchFlags, fetchSummary]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="flex border-b border-border px-4 pb-2">
        <Tabs defaultValue="logs" onValueChange={(v) => setActiveTab(v as 'logs' | 'flags' | 'summary')}>
          <TabsList>
            <TabsTrigger value="logs">
              <span>Log Langsung</span>
            </TabsTrigger>
            <TabsTrigger value="flags">
              <span>Penanda</span>
            </TabsTrigger>
            <TabsTrigger value="summary">
              <span>Ringkasan</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Log Langsung Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse rounded-md h-64 w-full border border-border/30" />
          ) : error ? (
            <div className="alert alert-error">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20">
                <path fill="currentColor" d="M18 6L14 12H10V6H5l3 3V4h3v8h5v-8h3l-3 3v-4zm-7 10L8 18l5-5 5 5-5 5L8 13z"/>
              </svg>
              <span>{error}</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter section */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select className="flex-1 rounded-md border border-border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary" onChange={(e: any) => {
                  // Filter by category - can be expanded
                }}>
                  <option value="">Semua Kategori</option>
                  <option value="ticket">Ticket</option>
                  <option value="auth">Autentikasi</option>
                  <option value="setting">Pengaturan</option>
                  <option value="user">Pengguna</option>
                  <option value="export">Ekspor</option>
                </select>
                <select className="rounded-md border border-border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary" onChange={(e: any) => {
                  // Filter by severity
                }}>
                  <option value="">Semua Severity</option>
                  <option value="info">Info</option>
                  <option value="notice">Notice</option>
                  <option value="warning">Warning</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                >
                  {loading && <span className="align-middle">Muat Ulang</span>}
                  {!loading && 'Refresh'}
                </Button>
              </div>

              {/* Logs Table */}
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
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{format(new Date(log.created_at), 'dd MMM HH:mm')}</TableCell>
                      <TableCell>{log.category}</TableCell>
                      <TableCell>{log.event_type}</TableCell>
                      <TableCell>
                        <Badge variant={log.severity === 'warning' ? 'destructive' : log.severity === 'notice' ? 'secondary' : 'default'}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.actor_name || 'N/A'}</TableCell>
                      <TableCell>{log.ticket_number || '-'}</TableCell>
                      <TableCell>{log.ip || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada log audit
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination/Info */}
              {logs.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Menampilkan {logs.length} log audit terakhir
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Real-time: {auditLogBadge > 0 ? `${auditLogBadge} baru` : 'Up to date'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Penanda Tab */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse rounded-md h-64 w-full border border-border/30" />
          ) : error ? (
            <div className="alert alert-error">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20">
                <path fill="currentColor" d="M18 6L14 12H10V6H5l3 3V4h3v8h5v-8h3l-3 3v-4zm-7 10L8 18l5-5 5 5-5 5L8 13z"/>
              </svg>
              <span>{error}</span>
            </div>
          ) : (
            <div className="space-y-4">
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
                  {flags.map((flag) => (
                    <TableRow key={flag.id} className="hover:bg-muted/50">
                      <TableCell>
                        {flag.details.tingkat === 'tinggi' ? (
                          <Badge variant="destructive">Tinggi</Badge>
                        ) : flag.details.tingkat === 'sedang' ? (
                          <Badge variant="secondary">Sedang</Badge>
                        ) : (
                          <Badge variant="default">Rendah</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={flag.severity === 'warning' ? 'destructive' : flag.severity === 'notice' ? 'secondary' : 'default'}>
                          {flag.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{(flag as any).ticket_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{flag.status}</Badge>
                      </TableCell>
                      <TableCell>{flag.details.petugas_nama || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Review flag"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {flags.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada penanda baru
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Filters for flags */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select className="flex-1 rounded-md border border-border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Semua Tipe</option>
                  <option value="jaringan_sama">Jaringan Sama</option>
                  <option value="rating_cepat">Rating Cepat</option>
                  <option value="rating_beruntun_ip">Rating Beruntun IP</option>
                </select>
                <select className="rounded-md border border-border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Semua Status</option>
                  <option value="baru">Baru</option>
                  <option value="ditinjau">Ditinjau</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ringkasan Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse rounded-md h-64 w-full border border-border/30" />
          ) : !summary ? (
            <p className="text-muted-foreground">Memuat ringkasan...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-md border border-border/30 bg-card">
                <p className="text-sm text-muted-foreground">Log Audit Mingguan</p>
                <p className="text-2xl font-medium">{summary.logs_this_week ?? 0}</p>
              </div>
              <div className="p-4 rounded-md border border-border/30 bg-card">
                <p className="text-sm text-muted-foreground">Penanda Baru</p>
                <p className="text-2xl font-medium">{summary.new_flags_this_week ?? 0}</p>
              </div>
              <div className="p-4 rounded-md border border-border/30 bg-card">
                <p className="text-sm text-muted-foreground">Flag Sudah Ditinjau</p>
                <p className="text-2xl font-medium">{summary.reviewed_count ?? 0}</p>
              </div>
              {/* Additional summary cards can be added here */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}