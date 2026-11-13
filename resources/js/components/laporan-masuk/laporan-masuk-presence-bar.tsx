import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { type PresenceMember } from '@/types/laporan-masuk';

const MAX_AVATARS = 3;
const ROLE_LABEL: Record<PresenceMember['role'], string> = {
    admin: 'Admin',
    operator: 'Operator',
    operator_tim: 'Operator Tim',
};

interface PresenceBarProps {
    viewers?: PresenceMember[];
    currentUserId: number;
    typingName?: string | null;
    className?: string;
}
/**
 * Indikator "sedang dilihat" — murni informasi, tidak mengunci aksi siapa pun.
 */
export function LaporanMasukPresenceBar({ viewers = [], currentUserId, typingName = null, className }: PresenceBarProps) {
    const others = viewers.filter((viewer) => viewer.id !== currentUserId);

    if (others.length === 0 && typingName === null) {
        return null;
    }

    const shown = others.slice(0, MAX_AVATARS);
    const overflow = others.length - shown.length;

    return (
        <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
            {others.length > 0 && (
                <HoverCard openDelay={100} closeDelay={80}>
                    <HoverCardTrigger asChild>
                        {/* Satu trigger untuk seluruh grup avatar. Tanpa atribut title. */}
                        <div
                            tabIndex={0}
                            role="button"
                            aria-label={`${others.length} orang sedang melihat laporan ini`}
                            className="flex cursor-default items-center -space-x-1.5"
                        >
                            {shown.map((viewer) => (
                                <span
                                    key={viewer.id}
                                    className="bg-muted text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase ring-2"
                                >
                                    {viewer.name.slice(0, 2)}
                                </span>
                            ))}
                            {overflow > 0 && (
                                <span className="bg-muted text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2">
                                    +{overflow}
                                </span>
                            )}
                        </div>
                    </HoverCardTrigger>

                    <HoverCardContent align="end" className="w-56 p-3 text-xs">
                        <p className="text-muted-foreground mb-2 font-medium">Sedang dilihat ({others.length})</p>
                        <ul className="space-y-2">
                            {others.map((viewer) => (
                                <li key={viewer.id} className="flex items-center gap-2">
                                    <span className="bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
                                        {viewer.name.slice(0, 2)}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{viewer.name}</span>
                                        <span className="text-muted-foreground block">{ROLE_LABEL[viewer.role]}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </HoverCardContent>
                </HoverCard>
            )}

            {typingName !== null && (
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <span className="flex gap-0.5" aria-hidden="true">
                        <span className="bg-muted-foreground inline-block size-1 animate-pulse rounded-full" />
                        <span className="bg-muted-foreground inline-block size-1 animate-pulse rounded-full [animation-delay:150ms]" />
                        <span className="bg-muted-foreground inline-block size-1 animate-pulse rounded-full [animation-delay:300ms]" />
                    </span>
                    {typingName} sedang mengetik balasan...
                </span>
            )}
        </div>
    );
}

export { LaporanMasukPresenceBar as PresenceBar };
