'use client';

import { Server, User } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';

// Lama tiap tahap (ms). Satu laporan = 2 tahap: Pelapor -> Server, lalu Server -> Operator.
const STEP_MS = 1400;
// Sedikit lebih lama dari STEP_MS agar beam terpotong sebelum mengulang.
const BEAM_SECONDS = 1.6;
const OPERATOR_COUNT = 3;

type BeamProps = ComponentProps<typeof AnimatedBeam>;

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(({ className, children }, ref) => (
    <div
        ref={ref}
        className={cn(
            'border-border bg-background text-foreground relative z-10 flex size-12 items-center justify-center rounded-full border-2 p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all duration-300',
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

const TurnBadge = ({ n }: { n: number }) => (
    <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold">
        {n}
    </span>
);

// Jalur selalu tampil (garis abu-abu). Gradien bergerak hanya muncul saat `active`.
function Link({ active, tick, ...props }: BeamProps & { active: boolean; tick: number }) {
    return (
        <AnimatedBeam
            key={active ? `on-${tick}` : 'off'}
            duration={BEAM_SECONDS}
            gradientStartColor={active ? undefined : 'transparent'}
            gradientStopColor={active ? undefined : 'transparent'}
            {...props}
        />
    );
}

export function AnimatedBeamRoundRobin() {
    const containerRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);
    const serverRef = useRef<HTMLDivElement>(null);
    const op1Ref = useRef<HTMLDivElement>(null);
    const op2Ref = useRef<HTMLDivElement>(null);
    const op3Ref = useRef<HTMLDivElement>(null);
    const opRefs = [op1Ref, op2Ref, op3Ref];

    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => setTick((t) => t + 1), STEP_MS);
        return () => window.clearInterval(id);
    }, []);

    // phase 0: Pelapor -> Server | phase 1: Server -> operator tujuan
    const phase = tick % 2;
    const target = Math.floor(tick / 2) % OPERATOR_COUNT; // 0, 1, 2
    const reportNo = target + 1;

    const activeRing = 'border-primary ring-4 ring-primary/20';

    return (
        <div className="w-full">
            <div
                ref={containerRef}
                className="relative mx-auto flex w-full max-w-2xl items-center justify-between overflow-hidden px-4 py-8 sm:px-10"
            >
                <Step ref={userRef} label="Pelapor" className={phase === 0 ? activeRing : undefined}>
                    <User className="size-6" />
                    <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                        Laporan {reportNo}
                    </span>
                </Step>

                <Step ref={serverRef} label="Web/Server">
                    <Server className="size-6" />
                </Step>

                <div className="flex flex-col gap-4">
                    {opRefs.map((ref, index) => {
                        const isTarget = phase === 1 && target === index;

                        return (
                            <Step key={index} ref={ref} label={`Operator ${index + 1}`} className={isTarget ? activeRing : undefined}>
                                <User className="size-6" />
                                <TurnBadge n={index + 1} />
                            </Step>
                        );
                    })}
                </div>

                <Link active={phase === 0} tick={tick} containerRef={containerRef} fromRef={userRef} toRef={serverRef} />
                {opRefs.map((ref, index) => (
                    <Link
                        key={index}
                        active={phase === 1 && target === index}
                        tick={tick}
                        containerRef={containerRef}
                        fromRef={serverRef}
                        toRef={ref}
                    />
                ))}
            </div>

            <p className="text-muted-foreground mx-auto mt-2 max-w-2xl px-4 text-center text-xs sm:px-10">
                Setiap laporan baru dibagikan ke satu operator aktif secara bergiliran: laporan 1 ke Operator 1, laporan 2 ke Operator 2, laporan 3 ke
                Operator 3, lalu kembali ke Operator 1. Operator penerima otomatis menjadi penanggung jawab.
            </p>
        </div>
    );
}
