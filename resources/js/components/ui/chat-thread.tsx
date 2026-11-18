import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { type ReactNode, type Ref, useState } from 'react';

export type ChatSide = 'officer' | 'reporter';

export type ChatMessage = {
    id: number | string;
    /** officer = admin / operator / operator tim (kiri, primary). reporter = pelapor (kanan, abu-abu). */
    side: ChatSide;
    senderName: string;
    badge?: string;
    body: string;
    messageOriginal?: string | null;
    hasProfanity?: boolean;
    createdAt: string;
    meta?: ReactNode;
    attachments?: ReactNode;
    notice?: ReactNode;
    muted?: boolean;
};

type ChatThreadProps = {
    messages: ChatMessage[];
    emptyState?: ReactNode;
    lastMessageRef?: Ref<HTMLDivElement>;
    className?: string;
};

const GROUP_GAP_MS = 5 * 60 * 1000;

const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function ChatBubble({ message, showHeader, className }: { message: ChatMessage; showHeader: boolean; className?: string }) {
    const isOfficer = message.side === 'officer';
    const date = new Date(message.createdAt);

    const canShowOriginal = Boolean(message.hasProfanity && message.messageOriginal);
    const [showOriginal, setShowOriginal] = useState(false);
    const displayBody = showOriginal && message.messageOriginal ? message.messageOriginal : message.body;

    return (
        <div
            aria-label={`${message.senderName}, ${timeFormat.format(date)}`}
            className={cn('flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]', isOfficer ? 'items-start self-start' : 'items-end self-end', className)}
        >
            {showHeader && (
                <div className={cn('flex flex-wrap items-center gap-2 px-1 text-xs', isOfficer ? 'justify-start' : 'justify-end')}>
                    <span className="font-medium">{message.senderName}</span>
                    {message.badge && (
                        <span className="bg-background text-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                            {message.badge}
                        </span>
                    )}
                </div>
            )}

             <div
                className={cn(
                    'w-fit max-w-full rounded-[1.25rem] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
                    message.muted
                        ? 'bg-muted text-muted-foreground border border-dashed italic'
                        : isOfficer
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground',
                )}
            >
                {displayBody}
            </div>

            {canShowOriginal && (
                <div className="mt-1 flex justify-end">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="text-xs shrink-0"
                    >
                        {showOriginal ? (
                            <>
                                <EyeOff className="mr-1 size-3.5" /> Sembunyikan Asli
                            </>
                        ) : (
                            <>
                                <Eye className="mr-1 size-3.5" /> Tampilkan Asli
                            </>
                        )}
                    </Button>
                </div>
            )}

            {message.notice}

            {message.attachments && (
                <div className={cn('flex flex-wrap gap-1.5', isOfficer ? 'justify-start' : 'justify-end')}>{message.attachments}</div>
            )}

            <div
                className={cn(
                    'text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px]',
                    isOfficer ? 'justify-start' : 'justify-end',
                )}
            >
                <time dateTime={message.createdAt}>{timeFormat.format(date)}</time>
                {message.meta}
            </div>
        </div>
    );
}

export function ChatThread({ messages, emptyState, lastMessageRef, className }: ChatThreadProps) {
    if (messages.length === 0) {
        return <>{emptyState ?? <p className="text-muted-foreground text-sm">Belum ada tanggapan.</p>}</>;
    }

    return (
        <div role="log" aria-live="polite" className={cn('flex flex-col', className)}>
            {messages.map((message, index) => {
                const prev = messages[index - 1];
                const date = new Date(message.createdAt);
                const prevDate = prev ? new Date(prev.createdAt) : null;

                const newDay = !prevDate || dayKey(prevDate) !== dayKey(date);
                const startsGroup = newDay || prev.side !== message.side || date.getTime() - prevDate!.getTime() > GROUP_GAP_MS;
                const isLast = index === messages.length - 1;

                return (
                    <div key={message.id} ref={isLast ? lastMessageRef : undefined} className="flex flex-col">
                        {newDay && (
                            <div className="text-muted-foreground my-4 text-center text-xs first:mt-0">{dayFormat.format(date)}</div>
                        )}
                        <ChatBubble message={message} showHeader={startsGroup} className={cn(!newDay && (startsGroup ? 'mt-4' : 'mt-1'))} />
                    </div>
                );
            })}
        </div>
    );
}