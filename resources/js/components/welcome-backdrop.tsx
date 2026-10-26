/**
 * Ambient decorative band behind the welcome hero + report form.
 * Pure CSS (no image assets): radial-gradient aurora pools, a faint
 * blueprint grid, and a diagonal light sweep — all dissolving via an
 * elliptical mask anchored at the top center (no hard edges, no seams).
 * Blooms are fully contained inside the viewport (their radials reach 0
 * at their own bounds) so no glow can ever be chopped by a screen edge.
 * Fixed inside the `relative isolate` wrapper in pages/welcome.tsx;
 * paints at -z-10 behind all content, header, footer, dialogs, toasts.
 */
export function WelcomeBackdrop() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -bottom-12 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden [mask-composite:intersect] [mask-image:radial-gradient(120%_95%_at_50%_0%,black_0%,black_45%,transparent_80%),linear-gradient(to_bottom,transparent,black_90px)]"
        >
            {/* diagonal light sweep */}
            <div className="absolute inset-0 [background-image:linear-gradient(105deg,transparent_30%,rgba(0,95,182,0.05)_45%,rgba(255,255,255,0.55)_52%,rgba(0,95,182,0.04)_59%,transparent_72%)] dark:[background-image:linear-gradient(105deg,transparent_30%,rgba(45,130,235,0.06)_45%,rgba(148,197,255,0.07)_52%,rgba(45,130,235,0.04)_59%,transparent_72%)]" />
            {/* faint blueprint grid */}
            <div className="absolute inset-0 [background-image:repeating-linear-gradient(90deg,var(--grid-line)_0px,var(--grid-line)_1px,transparent_1px,transparent_44px),repeating-linear-gradient(0deg,var(--grid-line)_0px,var(--grid-line)_1px,transparent_1px,transparent_44px)] [--grid-line:rgba(0,95,182,0.07)] [mask-image:radial-gradient(110%_80%_at_50%_0%,black_10%,transparent_70%)] dark:[--grid-line:rgba(148,197,255,0.06)]" />
            {/* aurora pool — deep brand blue, left of the hero (fully inside viewport) */}
            <div className="absolute top-0 left-[16%] size-64 rounded-full [background-image:radial-gradient(closest-side,rgba(0,95,182,0.16),rgba(120,170,235,0.09)_55%,transparent_100%)] sm:size-80 dark:[background-image:radial-gradient(closest-side,rgba(16,108,220,0.2),rgba(60,140,245,0.08)_55%,transparent_100%)]" />
            {/* aurora pool — lighter sky blue, right of the hero (fully inside viewport) */}
            <div className="absolute top-6 right-[16%] h-56 w-72 rounded-full [background-image:radial-gradient(closest-side,rgba(70,150,225,0.13),rgba(140,190,245,0.065)_55%,transparent_100%)] sm:top-8 sm:h-64 sm:w-96 dark:[background-image:radial-gradient(closest-side,rgba(48,140,245,0.16),rgba(90,170,250,0.07)_55%,transparent_100%)]" />
        </div>
    );
}
