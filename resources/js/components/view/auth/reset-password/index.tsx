import { FormField } from '@/components/auth/form-field';
import LoginBrandPanel from '@/components/auth/login-brand-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResetPasswordPageProps } from '@/types/auth';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeClosed, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

export default function ResetPasswordView({ token: tokenProp, email: emailProp, throttleSeconds = 0 }: ResetPasswordPageProps) {
    // Prioritaskan props dari controller; fallback ke URL: /reset-password/{token}?email=...
    const token = tokenProp ?? window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const email = emailProp ?? new URLSearchParams(window.location.search).get('email') ?? '';

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });
    // Email readonly, jadi error di field email berarti link reset bermasalah
    const linkProblem = !data.token || Boolean(errors.email);

    const [showPassword, setShowPassword] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (processing || throttleSeconds > 0 || linkProblem) {
            return;
        }

        // Validasi cepat di client, supaya tidak perlu bolak-balik ke server
        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'Konfirmasi password tidak sama.');
            confirmPasswordRef.current?.focus();
            return;
        }

        clearErrors();

        post(route('password.store'), {
            preserveScroll: true,
            onError: (formErrors) => {
                reset('password', 'password_confirmation');

                if (formErrors.password) {
                    passwordRef.current?.focus();
                } else if (formErrors.password_confirmation) {
                    confirmPasswordRef.current?.focus();
                }
            },
        });
    };

    return (
        <>
            <Head title="Reset Password" />
            <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-3xl">
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <LoginBrandPanel />

                            <form className="p-6 md:p-8" onSubmit={onSubmit}>
                                <div className="flex min-h-[350px] flex-col justify-center gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">Reset Password</h1>
                                        <p className="text-muted-foreground text-balance">Masukkan password baru untuk akun Anda.</p>
                                    </div>

                                    {linkProblem && (
                                        <div role="alert" className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
                                            <p>{errors.email ?? 'Link reset tidak valid.'}</p>
                                            <Link
                                                href={route('password.request')}
                                                className="mt-1 inline-block font-medium underline underline-offset-4"
                                            >
                                                Minta link reset baru
                                            </Link>
                                        </div>
                                    )}

                                    {/* Email: readonly, berasal dari link reset */}
                                    <FormField id="email" label="Email" icon={Mail} error={errors.email}>
                                        <Input
                                            type="email"
                                            name="email"
                                            readOnly
                                            value={data.email}
                                            className="bg-muted pl-9 text-sm"
                                            aria-readonly="true"
                                        />
                                    </FormField>

                                    {/* Password baru */}
                                    <FormField id="password" label="Password Baru" icon={LockKeyhole} error={errors.password}>
                                        <Input
                                            ref={passwordRef}
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            autoComplete="new-password"
                                            aria-invalid={errors.password ? 'true' : 'false'}
                                            aria-describedby={errors.password ? 'password-error' : undefined}
                                            className="pr-24 pl-9"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Masukkan password baru"
                                        />
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="absolute top-1/2 right-2 h-auto -translate-y-1/2 px-2 py-1 text-xs"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeClosed /> : <Eye />}
                                        </Button>
                                    </FormField>

                                    {/* Konfirmasi password */}
                                    <FormField
                                        id="password_confirmation"
                                        label="Konfirmasi Password"
                                        icon={LockKeyhole}
                                        error={errors.password_confirmation}
                                    >
                                        <Input
                                            ref={confirmPasswordRef}
                                            type={showPassword ? 'text' : 'password'}
                                            name="password_confirmation"
                                            required
                                            autoComplete="new-password"
                                            aria-invalid={errors.password_confirmation ? 'true' : 'false'}
                                            aria-describedby={errors.password_confirmation ? 'password-confirmation-error' : undefined}
                                            className="pl-9"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            placeholder="Ulangi password baru"
                                        />
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="absolute top-1/2 right-2 h-auto -translate-y-1/2 px-2 py-1 text-xs"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeClosed /> : <Eye />}
                                        </Button>
                                    </FormField>

                                    <Link href={route('login')} className="text-primary flex justify-end text-sm underline underline-offset-4">
                                        Kembali ke login
                                    </Link>

                                    <Button type="submit" className="w-full" disabled={processing || throttleSeconds > 0}>
                                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                        {throttleSeconds > 0 ? `Coba lagi dalam ${throttleSeconds} detik` : 'Simpan Password Baru'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
