'use client';

import { Inbox, Server, User } from 'lucide-react';
import { forwardRef, useRef, type ReactNode } from 'react';

import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(({ className, children }, ref) => (
    <div
        ref={ref}
        className={cn(
            'border-border bg-background text-foreground relative z-10 flex size-12 items-center justify-center rounded-full border-2 p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
            className,
        )}
    >
        {children}
    </div>
));

Circle.displayName = 'Circle';

const Step = forwardRef<HTMLDivElement, { label: string; className?: string; wrapperClassName?: string; children?: ReactNode }>(
    ({ label, className, wrapperClassName, children }, ref) => (
        <div className={cn('flex flex-col items-center gap-2', wrapperClassName)}>
            <Circle ref={ref} className={className}>
                {children}
            </Circle>
            <span className="text-muted-foreground text-center text-[11px] leading-tight font-medium">{label}</span>
        </div>
    ),
);

Step.displayName = 'Step';

export function AnimatedBeamFree() {
    const containerRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);
    const serverRef = useRef<HTMLDivElement>(null);
    const inboxRef = useRef<HTMLDivElement>(null);
    const op1Ref = useRef<HTMLDivElement>(null);
    const op2Ref = useRef<HTMLDivElement>(null);
    const op3Ref = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full">
            <div
                ref={containerRef}
                className="relative mx-auto flex w-full max-w-2xl items-center justify-between overflow-hidden px-4 py-8 sm:px-10"
            >
                <Step ref={userRef} label="Pelapor">
                    <User className="size-6" />
                </Step>

                <Step ref={serverRef} label="Server">
                    <Server className="size-6" />
                </Step>

                <Step ref={inboxRef} label="Laporan Masuk">
                    <Inbox className="size-6" />
                </Step>

                <div className="flex flex-col gap-4">
                    <Step ref={op1Ref} label="Operator 1">
                        <User className="size-6" />
                    </Step>
                    <Step ref={op2Ref} label="Operator 2">
                        <User className="size-6" />
                    </Step>
                    <Step ref={op3Ref} label="Operator 3">
                        <User className="size-6" />
                    </Step>
                </div>

                <AnimatedBeam duration={3} containerRef={containerRef} fromRef={userRef} toRef={serverRef} />
                <AnimatedBeam duration={3} delay={0.5} containerRef={containerRef} fromRef={serverRef} toRef={inboxRef} />
                <AnimatedBeam duration={3} delay={1} containerRef={containerRef} fromRef={inboxRef} toRef={op1Ref} />
                <AnimatedBeam duration={3} delay={1} containerRef={containerRef} fromRef={inboxRef} toRef={op2Ref} />
                <AnimatedBeam duration={3} delay={1} containerRef={containerRef} fromRef={inboxRef} toRef={op3Ref} />
            </div>

            <p className="text-muted-foreground mx-auto mt-2 max-w-2xl px-4 text-center text-xs sm:px-10">
                Laporan masuk ke kotak bersama. Semua operator bisa membalas laporan mana pun, tanpa penanggung jawab.
            </p>
        </div>
    );
}
