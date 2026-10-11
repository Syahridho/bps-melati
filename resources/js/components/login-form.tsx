import { SessionConflictCard, type SessionConflictInfo } from '@/components/session-conflict-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { type FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';

type NoticeReason = 'taken_over' | 'forced_logout' | 'deactivated' | 'expired';

interface LoginProps {
    status?: string;
    /** Alasan sesi berakhir, diteruskan lewat query string dari middleware. */
    noticeReason?: NoticeReason | string | null;
    /** Sisa detik throttle terakhir, dipakai untuk hitung mundur di UI. */
    throttleSeconds?: number;
    /** Data konflik sesi yang dikirim server lewat flash. */
    sessionConflict?: SessionConflictInfo | null;
}

const NOTICE_MESSAGES: Record<string, string> = {
    taken_over: 'Sesi Anda berakhir karena akun ini login di perangkat lain.',
    forced_logout: 'Sesi Anda berakhir karena administrator mengakhiri sesi Anda.',
    deactivated: 'Akun Anda dinonaktifkan. Hubungi administrator.',
    expired: 'Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali.',
};

export default function LoginForm({ status, noticeReason, throttleSeconds, sessionConflict }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [conflict, setConflict] = useState<SessionConflictInfo | null>(sessionConflict ?? null);
    const [remainingSeconds, setRemainingSeconds] = useState<number>(throttleSeconds ?? 0);
    const [cooldownUntil, setCooldownUntil] = useState<number>(() => (throttleSeconds ? Date.now() + throttleSeconds * 1000 : 0));

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const alertRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        force: false as boolean,
    });

    // Hitung mundur throttle: tombol nonaktif sampai detik habis, aktif lagi otomatis.
    useEffect(() => {
        if (cooldownUntil === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
            setRemainingSeconds(remaining);

            if (remaining === 0) {
                setCooldownUntil(0);
                window.clearInterval(timer);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [cooldownUntil]);

    // Fokus otomatis ke elemen bermasalah pertama (field, atau alert umum).
    useEffect(() => {
        if (errors.password || errors.email) {
            (errors.password ? passwordRef : emailRef).current?.focus();
        } else if (conflict !== null || noticeReason) {
            alertRef.current?.focus();
        }
    }, [errors, conflict, noticeReason]);

    const generalError = (errors as Record<string, string | undefined>).general;
    const isThrottled = cooldownUntil > 0;
    const noticeMessage = noticeReason ? (NOTICE_MESSAGES[noticeReason] ?? null) : null;

    const submit = useCallback(
        (force: boolean) => {
            if (processing || (isThrottled && !force)) {
                return;
            }

            post(route('login'), {
                preserveScroll: true,
                onSuccess: () => {
                    setConflict(null);
                    setCooldownUntil(0);
                    setRemainingSeconds(0);
                    reset('password', 'force');
                },
                onFinish: () => reset('password'),
                onError: () => setData('force', false),
            });
        },
        [isThrottled, post, processing, reset, setData],
    );

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        submit(false);
    };

    const handleTakeover = () => {
        setData('force', true);
        submit(true);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <Card className="overflow-hidden p-0">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        <div className="from-primary/10 via-primary/5 dark:from-primary/20 dark:via-primary/10 relative hidden bg-gradient-to-br to-transparent md:flex md:flex-col md:items-center md:justify-center dark:to-transparent">
                            <div className="relative flex flex-col items-center justify-center">
                                {/* Logo utama di tengah */}
                                <img
                                    src="/melati_big.webp"
                                    alt="Logo"
                                    className="-mt-16 h-44 w-44 object-contain drop-shadow-lg dark:brightness-90"
                                />

                                {/* Logo teks di bawahnya dengan absolute yang terukur */}
                                <img
                                    src="/desc-melati.webp"
                                    alt="Logo Desc"
                                    className="absolute -bottom-20 h-28 w-auto object-contain drop-shadow-md dark:brightness-90"
                                />
                            </div>
                        </div>

                        <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                            <div className="flex min-h-[350px] flex-col justify-center gap-6">
                                <div className="flex flex-col items-center text-center">
                                    <h1 className="text-2xl font-bold">Selamat Datang</h1>
                                    <p className="text-muted-foreground text-balance">Masuk ke akun melati Anda</p>
                                </div>

                                {/* <div ref={alertRef} tabIndex={-1} className="space-y-3 focus:outline-none">
                                    {status && <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">{status}</p>}

                                    {noticeMessage && (
                                        <LoginAlert id="login-notice" tone="warning" title="Sesi Anda berakhir" message={noticeMessage} />
                                    )}

                                    {isThrottled && (
                                        <LoginAlert
                                            id="login-throttle"
                                            tone="error"
                                            title="Terlalu banyak percobaan"
                                            message={`Terlalu banyak percobaan login. Coba lagi dalam ${remainingSeconds} detik.`}
                                        />
                                    )}

                                    {!isThrottled && conflict === null && errors.email && (
                                        <LoginAlert id="login-error" tone="error" message={errors.email} />
                                    )}

                                    {!isThrottled && conflict === null && !errors.email && generalError && (
                                        <LoginAlert id="login-error" tone="error" message={generalError} />
                                    )}
                                </div> */}

                                {conflict !== null ? (
                                    <SessionConflictCard
                                        conflict={conflict}
                                        processing={processing}
                                        onCancel={() => {
                                            setConflict(null);
                                            emailRef.current?.focus();
                                        }}
                                        onConfirm={handleTakeover}
                                    />
                                ) : (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail
                                                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                                    aria-hidden="true"
                                                />
                                                <Input
                                                    ref={emailRef}
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="username"
                                                    aria-invalid={errors.email ? 'true' : 'false'}
                                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                                    className="pl-9"
                                                    value={data.email}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                    placeholder="Masukkan email Anda"
                                                />
                                            </div>
                                            {errors.email && (
                                                <p id="email-error" className="text-destructive text-xs">
                                                    {errors.email}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password</Label>
                                            <div className="relative">
                                                <LockKeyhole
                                                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                                    aria-hidden="true"
                                                />
                                                <Input
                                                    ref={passwordRef}
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="current-password"
                                                    aria-invalid={errors.password ? 'true' : 'false'}
                                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                                    className="px-9"
                                                    value={data.password}
                                                    onChange={(e) => setData('password', e.target.value)}
                                                    placeholder="Masukkan password Anda"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                                    aria-pressed={showPassword}
                                                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-sm"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="size-4" aria-hidden="true" />
                                                    ) : (
                                                        <Eye className="size-4" aria-hidden="true" />
                                                    )}
                                                </button>
                                            </div>
                                            {errors.password && (
                                                <p id="password-error" className="text-destructive text-xs">
                                                    {errors.password}
                                                </p>
                                            )}
                                        </div>

                                        <Button type="submit" className="w-full" tabIndex={3} disabled={processing || isThrottled}>
                                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                            {isThrottled ? `Coba lagi dalam ${remainingSeconds} detik` : 'Login'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-muted-foreground hover:[&_a]:text-primary mt-4 text-center text-xs text-balance [&_a]:underline [&_a]:underline-offset-4">
                    &copy; {new Date().getFullYear()} Melati. All rights reserved. Powered by{' '}
                    <a href="https://riau.bps.go.id/" target="_blank" rel="noopener noreferrer">
                        BPS Provinsi Riau
                    </a>
                    .
                </div>
            </div>
        </div>
    );
}
