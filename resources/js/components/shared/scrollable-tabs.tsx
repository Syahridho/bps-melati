import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollableTabsProps {
    /** Tab buttons rendered in visual order (each child is expected to be a focusable <button>). */
    children: React.ReactNode;
    /** Index of the active button among the rendered children. */
    activeIndex: number;
    /** Additional classes for the outer wrapper, e.g. to adjust border or background. */
    className?: string;
    /** Accessible label for the tab group, e.g. "Filter laporan masuk". */
    ariaLabel?: string;
}

const SCROLL_STEP_RATIO = 0.7;
/** Width of the arrow overlay zone on each side when the desktop gutters are shown. */
const ARROW_ZONE = 36;

const clampScroll = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** Pure edge computation; values tolerate sub-pixel rounding and force both edges "at edge" when there is no overflow. */
function computeEdges(track: HTMLDivElement) {
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const hasOverflow = scrollWidth > clientWidth + 1;
    return {
        hasOverflow,
        atStart: !hasOverflow || scrollLeft <= 1,
        atEnd: !hasOverflow || scrollLeft + clientWidth >= scrollWidth - 1,
    };
}

/** Smooth scrolling unless the user prefers reduced motion. */
const scrollBehavior = (): ScrollBehavior =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/**
 * Scrolls a button to the nearest horizontal edge inside the track without moving the page vertically.
 * `inset` keeps the focused button clear of the fixed arrow overlay on both sides.
 */
function scrollButtonIntoView(track: HTMLDivElement, button: HTMLElement, behavior: ScrollBehavior, inset = 0) {
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return;
    const trackRect = track.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const left = buttonRect.left - trackRect.left + track.scrollLeft;
    const right = left + buttonRect.width;
    let target = track.scrollLeft;
    if (left < track.scrollLeft + inset) {
        target = left - inset;
    } else if (right > track.scrollLeft + track.clientWidth - inset) {
        target = right - track.clientWidth + inset;
    }
    const clamped = clampScroll(target, max);
    if (Math.abs(clamped - track.scrollLeft) >= 1) {
        track.scrollTo({ left: clamped, behavior });
    }
}

export function ScrollableTabs({ children, activeIndex, className, ariaLabel }: ScrollableTabsProps) {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const hasMountedRef = React.useRef(false);
    const [edges, setEdges] = React.useState({ hasOverflow: false, atStart: true, atEnd: true });
    const [isWide, setIsWide] = React.useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 640px)').matches));

    const measure = React.useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const next = computeEdges(track);
        setEdges((prev) => (prev.hasOverflow === next.hasOverflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
    }, []);

    /** Arrows + reserved gutters are constant (never per-scroll-position) on desktop while the row overflows. */
    const showGutters = isWide && edges.hasOverflow;

    React.useLayoutEffect(() => {
        measure();
    }, [measure]);

    // Track resizes and content changes (e.g. badge counts refreshing after an Inertia partial reload).
    React.useEffect(() => {
        const track = trackRef.current;
        const content = contentRef.current;
        if (!track || !content) return;
        const observer = new ResizeObserver(() => measure());
        observer.observe(track);
        observer.observe(content);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    // Arrows are hidden below the sm breakpoint; touch scrolling and edge fades stay available.
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const query = window.matchMedia('(min-width: 640px)');
        const onQueryChange = (event: MediaQueryListEvent) => setIsWide(event.matches);
        setIsWide(query.matches);
        query.addEventListener('change', onQueryChange);
        return () => query.removeEventListener('change', onQueryChange);
    }, []);

    // Center the active tab on mount and whenever the active index or resolved gutter geometry changes —
    // never on unrelated parent re-renders: every dep is a stable value (boolean/number/callback), so a
    // fresh `children` identity or updated badge counts cannot re-trigger it and yank the scroll position.
    // The settled guard skips the run while a gutter-padding change is still pending from the measure()
    // above, so centering is computed against final geometry (no clipped last tab, no flash on mount).
    React.useLayoutEffect(() => {
        measure();
        const track = trackRef.current;
        const content = contentRef.current;
        if (!track || !content) return;
        const live = computeEdges(track);
        // Rendered gutter state (this commit's padding) vs. state the pending measure() will settle to.
        const gutterNow = isWide && edges.hasOverflow;
        const gutterNext = isWide && live.hasOverflow;
        if (gutterNext !== gutterNow) return;
        const buttons = content.querySelectorAll('button');
        const button = activeIndex >= 0 ? buttons[activeIndex] : undefined;
        if (!button) return;
        const max = track.scrollWidth - track.clientWidth;
        if (max <= 0) return;
        const trackRect = track.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const left = buttonRect.left - trackRect.left + track.scrollLeft;
        const target = clampScroll(left + buttonRect.width / 2 - track.clientWidth / 2, max);
        if (Math.abs(target - track.scrollLeft) >= 1) {
            track.scrollTo({ left: target, behavior: hasMountedRef.current ? scrollBehavior() : 'auto' });
        }
        hasMountedRef.current = true;
    }, [activeIndex, measure, isWide, edges.hasOverflow]);

    const scrollByStep = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) return;
        const max = track.scrollWidth - track.clientWidth;
        if (max <= 0) return;
        track.scrollTo({ left: clampScroll(track.scrollLeft + direction * track.clientWidth * SCROLL_STEP_RATIO, max), behavior: scrollBehavior() });
    };

    const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
        const track = trackRef.current;
        const button = (event.target as HTMLElement).closest('button');
        if (!track || !button) return;
        scrollButtonIntoView(track, button, scrollBehavior(), showGutters ? ARROW_ZONE : 0);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const track = trackRef.current;
        const content = contentRef.current;
        if (!track || !content) return;
        const buttons = Array.from(content.querySelectorAll('button'));
        const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (currentIndex === -1) return;
        event.preventDefault();
        const nextIndex = event.key === 'ArrowLeft' ? Math.max(currentIndex - 1, 0) : Math.min(currentIndex + 1, buttons.length - 1);
        const next = buttons[nextIndex];
        if (!next) return;
        next.focus({ preventScroll: true });
        scrollButtonIntoView(track, next, scrollBehavior(), showGutters ? ARROW_ZONE : 0);
    };

    return (
        <div className={cn('bg-card relative min-w-0 border-b', className)} {...(ariaLabel ? { role: 'group', 'aria-label': ariaLabel } : {})}>
            <div
                ref={trackRef}
                onScroll={measure}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                className={cn(
                    'min-w-0 overflow-x-auto overscroll-x-contain py-2 pr-4 pl-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    showGutters && 'pr-11 pl-11',
                )}
            >
                <div ref={contentRef} className="flex w-max items-center gap-1">
                    {children}
                </div>
            </div>

            <div
                aria-hidden="true"
                className={cn(
                    'from-card pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r to-transparent transition-opacity',
                    edges.hasOverflow && !edges.atStart ? 'opacity-100' : 'opacity-0',
                )}
            />
            <div
                aria-hidden="true"
                className={cn(
                    'from-card pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l to-transparent transition-opacity',
                    edges.hasOverflow && !edges.atEnd ? 'opacity-100' : 'opacity-0',
                )}
            />

            {showGutters && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={edges.atStart}
                        aria-label="Geser tab ke kiri"
                        onClick={() => scrollByStep(-1)}
                        className="bg-card absolute top-1/2 left-1 z-20 size-8 -translate-y-1/2 rounded-full shadow-sm"
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={edges.atEnd}
                        aria-label="Geser tab ke kanan"
                        onClick={() => scrollByStep(1)}
                        className="bg-card absolute top-1/2 right-1 z-20 size-8 -translate-y-1/2 rounded-full shadow-sm"
                    >
                        <ChevronRight />
                    </Button>
                </>
            )}
        </div>
    );
}
