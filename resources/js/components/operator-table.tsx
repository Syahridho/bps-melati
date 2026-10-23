import { OperatorStatusBadge } from '@/components/operator-status-badge';
import { type PaginatedData, Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatLastLogin } from '@/lib/operator-utils';
import { type Operator } from '@/types/operator';
import { Edit, LogOut, MoreHorizontal, Search, Trash2, UserPlus, Users } from 'lucide-react';

interface OperatorTableProps {
    operators: PaginatedData<Operator>;
    authUserId: number;
    search: string;
    onSearchChange: (value: string) => void;
    onPerPageChange: (perPage: number) => void;
    onOpenCreate: () => void;
    onEdit: (operator: Operator) => void;
    onForceLogout: (operator: Operator) => void;
    onDelete: (operator: Operator) => void;
}

export function OperatorTable({
    operators,
    authUserId,
    search,
    onSearchChange,
    onPerPageChange,
    onOpenCreate,
    onEdit,
    onForceLogout,
    onDelete,
}: OperatorTableProps) {
    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <Users className="text-primary h-5 w-5" />
                        Daftar Akun Pengguna
                    </CardTitle>
                    <CardDescription>Total {operators.total} akun terdaftar dalam sistem</CardDescription>
                </div>
                <Button onClick={onOpenCreate} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Tambah Pengguna Baru
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative max-w-sm flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Cari berdasarkan nama atau email..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Tabel Pengguna */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">No</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Login Terakhir</TableHead>
                                <TableHead className="w-[100px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operators.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                                        Tidak ada data pengguna ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                operators.data.map((op, idx) => (
                                    <TableRow key={op.id}>
                                        <TableCell className="font-medium">{(operators.current_page - 1) * operators.per_page + idx + 1}</TableCell>
                                        <TableCell className="text-foreground font-semibold">{op.name}</TableCell>
                                        <TableCell>{op.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    op.role === 'admin'
                                                        ? 'default'
                                                        : op.role === 'operator_tim'
                                                          ? 'outline'
                                                          : 'secondary'
                                                }
                                                className="capitalize"
                                            >
                                                {op.role === 'operator_tim' ? 'Operator Tim' : op.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <OperatorStatusBadge isActive={op.is_active} isOnline={op.is_online} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {op.last_login_at ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span>{formatLastLogin(op.last_login_at)}</span>
                                                    <span className="text-[10px] opacity-80">
                                                        {op.last_login_device}
                                                        {op.last_login_ip ? ` · ${op.last_login_ip}` : ''}
                                                    </span>
                                                </div>
                                            ) : (
                                                'Belum pernah login'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Buka menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEdit(op)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {op.has_session && op.id !== authUserId && (
                                                        <DropdownMenuItem
                                                            onClick={() => onForceLogout(op)}
                                                            className="text-amber-600 focus:text-amber-600 dark:text-amber-400"
                                                        >
                                                            <LogOut className="mr-2 h-4 w-4" />
                                                            Paksa Logout
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(op)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <Pagination
                    links={operators.links}
                    from={operators.from}
                    to={operators.to}
                    total={operators.total}
                    lastPage={operators.last_page}
                    perPage={operators.per_page}
                    onPerPageChange={onPerPageChange}
                />
            </CardContent>
        </Card>
    );
}
