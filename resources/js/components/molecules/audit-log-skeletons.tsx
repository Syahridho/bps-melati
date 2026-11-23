import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function LogsSkeleton({ rows = 8 }: { rows?: number }) {
    const widths = ['w-40', 'w-56', 'w-48', 'w-64', 'w-32', 'w-52', 'w-44', 'w-60'];
    return (
        <div aria-busy="true" aria-label="Memuat log audit" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-24" />
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
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="mt-1 h-3 w-12" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className={`h-4 ${widths[i % widths.length]}`} />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    );
}

export function FlagsSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div aria-busy="true" aria-label="Memuat penanda" className="space-y-4">
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
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-muted/50">
                            <TableCell>
                                <Skeleton className="h-5 w-24 rounded-full" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-28" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function SummarySkeleton({ cards = 3 }: { cards?: number }) {
    return (
        <div aria-busy="true" aria-label="Memuat ringkasan" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: cards }).map((_, i) => (
                <div key={i} className="border-border/30 bg-card rounded-md border p-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-3 h-8 w-16" />
                </div>
            ))}
        </div>
    );
}

export function FlagReviewSkeleton() {
    return (
        <div aria-busy="true" aria-label="Memuat detail penanda" className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="bg-muted/40 space-y-2 rounded-md border p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
            </div>
        </div>
    );
}