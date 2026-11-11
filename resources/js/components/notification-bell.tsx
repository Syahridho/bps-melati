import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, ChevronRight, Clock, MoreHorizontal } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';

const TYPE_ICON: Record<string, React.ElementType> = {
    laporan_masuk: Bell,
    laporan_selesai: Clock,
    laporan_dibalas: ChevronRight,
    input_data: Bell,
};

const TYPE_CLASS: Record<string, string> = {
    laporan_masuk: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
    laporan_selesai: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    laporan_dibalas: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
    input_data: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
};

interface NotificationBellProps {
    userId: number;
    initialUnreadCount?: number;
}

export function NotificationBell({
    userId,
    initialUnreadCount = 0,
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState('semua');

    const {
        notifications,
        unreadCount,
        loading,
        error,
        hasMore,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        loadNotifications,
        loadUnreadCount,
    } = useNotifications(userId, initialUnreadCount);

    const empty = notifications.length === 0;

    const sortedNotifications = useMemo(
        () => [...notifications].sort((a, b) => {
            const aDate = new Date(a.created_at).getTime();
            const bDate = new Date(b.created_at).getTime();
            return bDate - aDate;
        }),
        [notifications],
    );

    const filteredNotifications = useMemo(() => {
        if (tab === 'belum_dibaca') {
            return sortedNotifications.filter((n) => !n.read_at);
        }
        return sortedNotifications;
    }, [sortedNotifications, tab]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore) return;
        await loadNotifications(true);
    }, [hasMore, loadNotifications]);

    const relativeTime = useCallback((iso: string): string => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMinutes = Math.floor(diffMs / 60_000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Baru saja';
        if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari lalu`;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }, []);

    useEffect(() => {
        if (isOpen && notifications.length === 0 && !loading && !error) {
            loadNotifications();
            loadUnreadCount();
        }
    }, [isOpen, notifications.length, loading, error, loadNotifications, loadUnreadCount]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={setIsOpen}
            modal={false}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-md cursor-pointer"
                    aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi, tidak ada yang belum dibaca'}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-live="polite"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[380px] max-w-[calc(100vw-2rem)] p-0" align="end" side="bottom">
                <div className="flex flex-col h-[560px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
                        <span className="text-sm font-semibold">Notifikasi</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            disabled={unreadCount === 0}
                            className="text-xs px-2"
                        >
                            Tandai semua dibaca
                        </Button>
                    </div>
                    <Separator />

                    {/* Tabs */}
                    <div className="flex border-b bg-background">
                        <Tabs value={tab} onValueChange={setTab} className="w-full">
                            <TabsList className="w-full p-0 border-none bg-background">
                                <TabsTrigger
                                    value="semua"
                                    className={cn(
                                        'flex-1 py-2.5 text-sm border-b-2 font-medium text-center transition-colors',
                                        tab === 'semua'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Semua
                                </TabsTrigger>
                                <TabsTrigger
                                    value="belum_dibaca"
                                    className={cn(
                                        'flex-1 py-2.5 text-sm border-b-2 font-medium text-center transition-colors',
                                        tab === 'belum_dibaca'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Belum dibaca
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Konten */}
                    <div className="flex-1 overflow-y-auto">
                        {loading && empty && (
                            <div className="p-4 space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-center text-xs text-destructive">
                                {error}
                                <button
                                    onClick={() => loadNotifications()}
                                    className="mt-2 text-xs underline hover:text-primary"
                                >
                                    Coba lagi
                                </button>
                            </div>
                        )}

                    {!loading && !error && empty && (
                        <div className="p-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <BellOff className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Belum ada notifikasi
                            </p>
                        </div>
                    )}

                    {!loading && !error && !empty && (
                            <ScrollArea className="h-full w-full">
                                <div role="list" className="divide-y divide-muted/50">
                                    {filteredNotifications.map((n) => {
                                        const Icon = TYPE_ICON[n.type] || Bell;
                                        const typeClass = TYPE_CLASS[n.type] || '';
                                        const isRead = n.read_at !== null;

                                        return (
                                            <div
                                                key={n.id}
                                                role="listitem"
                                                onClick={() => {
                                                    if (!isRead) {
                                                        markAsRead(n.id);
                                                    }
                                                    if (n.url) {
                                                        router.visit(n.url, { preserveScroll: true });
                                                        setIsOpen(false);
                                                    }
                                                }}
                                                className={cn(
                                                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer select-none',
                                                    isRead
                                                        ? 'bg-transparent hover:bg-muted'
                                                        : 'bg-primary/5 hover:bg-primary/10',
                                                )}
                                            >
                                                <div className="flex items-center justify-center shrink-0">
                                                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', typeClass)}>
                                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                                    </div>
                                                    {!isRead && (
                                                        <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-primary" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-foreground leading-tight truncate">
                                                        {n.title}
                                                    </div>
                                                    {n.message && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                    )}
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        {n.ticket_number && (
                                                            <span className="text-[11px] font-mono text-muted-foreground truncate">
                                                                #{n.ticket_number}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {relativeTime(n.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-2 shrink-0">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                                                aria-label={isRead ? 'Tandai belum dibaca' : 'Tandai dibaca'}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isRead) {
                                                                        markAsUnread(n.id);
                                                                    } else {
                                                                        markAsRead(n.id);
                                                                    }
                                                                }}
                                                                className="text-sm"
                                                            >
                                                                {isRead ? 'Tandai belum dibaca' : 'Tandai dibaca'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Infinite scroll sentinel */}
                                    {!empty && hasMore && (
                                        <div
                                            ref={(node) => {
                                                if (!node) return;
                                                const observer = new IntersectionObserver(
                                                    (entries) => {
                                                        if (entries[0].isIntersecting) {
                                                            handleLoadMore();
                                                        }
                                                    },
                                                    { root: null, rootMargin: '100px', threshold: 0 },
                                                );
                                                observer.observe(node);
                                                return () => observer.disconnect();
                                            }}
                                            className="h-1"
                                        />
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
