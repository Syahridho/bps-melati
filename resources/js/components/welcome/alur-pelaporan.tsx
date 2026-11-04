import { cn } from '@/lib/utils';
import { ALUR_STEPS } from '@/lib/welcome-constants';

export function AlurPelaporan() {
    return (
        <section aria-labelledby="alur-title" className="mx-auto w-full max-w-5xl rounded-lg px-4 py-10 md:py-14">
            <div className="mx-auto mb-8 max-w-2xl space-y-2 text-center md:mb-12">
                <h3 id="alur-title" className="text-xl font-bold tracking-tight sm:text-2xl">
                    Bagaimana Alur Pelaporan?
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">5 langkah mudah menyampaikan dan memantau laporan Anda hingga selesai.</p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-5 md:gap-4">
                {ALUR_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isFirst = index === 0;
                    const isLast = index === ALUR_STEPS.length - 1;

                    return (
                        <li
                            key={step.title}
                            className={cn(
                                'relative flex flex-row gap-4 text-left md:flex-col md:items-center md:text-center',
                                !isLast ? 'pb-8 md:pb-0' : 'pb-0',
                            )}
                        >
                            {/* Garis penghubung antar langkah */}
                            {!isLast && (
                                <div
                                    aria-hidden="true"
                                    className="bg-border absolute top-12 bottom-0 left-6 z-0 w-px -translate-x-1/2 md:top-7 md:bottom-auto md:left-1/2 md:h-px md:w-full md:translate-x-0"
                                />
                            )}

                            {/* Lingkaran Ikon */}
                            <div
                                className={cn(
                                    'relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full transition-colors md:size-14',
                                    isFirst ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card text-foreground border shadow-sm',
                                )}
                            >
                                <Icon className="size-5 md:size-6" aria-hidden="true" />
                            </div>

                            {/* Teks Deskripsi */}
                            <div className="min-w-0 flex-1 pt-1 md:mt-4 md:flex-none md:pt-0">
                                <h4 className="text-sm font-semibold md:text-sm lg:text-base">{step.title}</h4>
                                <p className="text-muted-foreground mt-1 text-xs lg:text-sm">{step.description}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
