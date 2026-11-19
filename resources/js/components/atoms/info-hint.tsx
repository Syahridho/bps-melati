import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface InfoHintProps {
    children: ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoHint({ children, side }: InfoHintProps) {
    return (
        <HoverCard openDelay={0} closeDelay={100}>
            <HoverCardTrigger asChild>
                <span aria-hidden className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-4" />
                </span>
            </HoverCardTrigger>
            <HoverCardContent side={side} className="w-auto px-3 py-1.5 text-sm">
                {children}
            </HoverCardContent>
        </HoverCard>
    );
}
