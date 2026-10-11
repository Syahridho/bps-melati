import { cn } from '@/lib/utils';
import { type PresenceMember } from './realtime-types';

const MAX_AVATARS = 3;
const ROLE_LABEL: Record<PresenceMember['role'], string> = {
    admin: 'Admin',
    operator: 'Operator',
};

interface PresenceBarProps {
    viewers: PresenceMember[];
    currentUserId: number;
    typingName: string | null;
    className?: string;
}

/**
 * Indikator "sedang dilihat" — murni informasi, tidak mengunci aksi siapa pun.
 */
export function PresenceBar({ viewers, currentUserId, typingName, className }: PresenceBarProps) {
    const others = viewers.filter((viewer) => viewer.id !== currentUserId);

    if (others.length === 0 && typingName === null) {
        return null;
    }

    const shown = others.slice(0, MAX_AVATARS);
    const overflow = others.length - shown.length;

    return (
        <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
            {others.length > 0 && (
                <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                        {shown.map((viewer) => (
                            <span
                                key={viewer.id}
                                title={`${viewer.name} (${ROLE_LABEL[viewer.role]})`}
                                className="bg-muted text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase ring-2"
                            >
                                {viewer.name.slice(0, 2)}
                            </span>
                        ))}
                    </div>
                    <span className="text-muted-foreground">
                        {overflow > 0
                            ? `Sedang dilihat: ${shown.map((v) => v.name).join(', ')} +${overflow}`
                            : `Sedang dilihat: ${shown.map((v) => v.name).join(', ')}`}
                    </span>
                </div>
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
