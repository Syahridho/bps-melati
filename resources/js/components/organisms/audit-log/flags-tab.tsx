import { Eye } from 'lucide-react';

import { FlagsSkeleton } from '@/components/molecules/audit-log-skeletons';
import { ErrorBox } from '@/components/molecules/error-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { useAuditFlags } from '@/hooks/audit-log/use-audit-flags';
import { FLAG_TYPE_LABELS } from '@/lib/audit-log';
import type { ReviewGroup } from '@/types/audit-log';

type FlagsTabProps = ReturnType<typeof useAuditFlags> & {
    onReview: (group: ReviewGroup) => void;
};

const tingkatBadge = {
    tinggi: <Badge variant="destructive">Tinggi</Badge>,
    sedang: <Badge variant="secondary">Sedang</Badge>,
    rendah: <Badge variant="default">Rendah</Badge>,
};

export function FlagsTab({ groups, loading, error, typeFilter, setTypeFilter, statusFilter, setStatusFilter, onReview }: FlagsTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <select
                    className="border-border focus:ring-primary flex-1 rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">Semua Tipe</option>
                    <option value="jaringan_sama">Jaringan Sama</option>
                    <option value="rating_beruntun_ip">Rating Beruntun IP</option>
                    <option value="selesai_cepat_setelah_balasan">Selesai Cepat Setelah Balasan</option>
                </select>
                <select
                    className="border-border focus:ring-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Semua Status</option>
                    <option value="baru">Baru</option>
                    <option value="ditinjau">Ditinjau</option>
                </select>
            </div>

            {loading ? (
                <FlagsSkeleton />
            ) : error ? (
                <ErrorBox message={error} />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Tingkat</TableHead>
                            <TableHead>Tiket</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Petugas</TableHead>
                            <TableHead>Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.map((group) => (
                            <TableRow key={group.key} className="hover:bg-muted/50">
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {group.types.map((t) => (
                                            <Badge key={t} variant="outline">
                                                {FLAG_TYPE_LABELS[t] ?? t}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>{tingkatBadge[group.tingkat]}</TableCell>
                                <TableCell>{group.ticket_number || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{group.representative.status}</Badge>
                                </TableCell>
                                <TableCell>{group.representative.details?.petugas_nama || 'N/A'}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" aria-label="Tinjau penanda" onClick={() => onReview(group)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {groups.length === 0 && (
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
    );
}
