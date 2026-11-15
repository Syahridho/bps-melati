import { FormField } from '@/components/auth/form-field';
import LoginBrandPanel from '@/components/auth/login-brand-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail } from 'lucide-react';
import { FormEvent, useRef } from 'react';

interface ForgotPasswordPageProps {
    status?: string;
    noticeReason?: string | null;
    throttleSeconds?: number;
}

// sessionConflict, canResetPassword props

export default function ForgotPasswordPage({ status, throttleSeconds = 0 }: ForgotPasswordPageProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
    });

    const emailRef = useRef<HTMLInputElement>(null);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (processing || throttleSeconds > 0) {
            return;
        }

        post(route('password.email'), {
            onSuccess: () => {
                // Pesan sukses ditampilkan lewat inertia flash
                reset('email');
            },
            onError: () => {
                // Error handling via form validation
            },
        });
    };

    return (
        <>
            <Head title="Lupa Password" />
            <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-3xl">
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <LoginBrandPanel />

                            <form className="p-6 md:p-8" onSubmit={onSubmit}>
                                <div className="flex min-h-[350px] flex-col justify-center gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">Lupa Password</h1>
                                        <p className="text-muted-foreground text-balance">
                                            Masukkan email terdaftar untuk menerima link reset password.
                                        </p>
                                    </div>

                                    {/* Tampilkan pesan status sukses di atas field email */}
                                    {status && (
                                        <div className="mt-2 overflow-hidden rounded-md bg-green-50 text-center text-sm text-green-700">
                                            <span className="block py-2">{status}</span>
                                        </div>
                                    )}

                                    <FormField id="email" label="Email" icon={Mail} error={errors.email}>
                                        <Input
                                            ref={emailRef}
                                            type="email"
                                            name="email"
                                            required
                                            autoComplete="email"
                                            aria-invalid={errors.email ? 'true' : 'false'}
                                            aria-describedby={errors.email ? 'email-error' : undefined}
                                            className="pl-9"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="Masukkan email Anda"
                                        />
                                    </FormField>

                                    <a href="/login" className="text-primary mr-2 flex justify-end text-sm underline underline-offset-4">
                                        Kembali ke login
                                    </a>

                                    <Button type="submit" className="w-full" disabled={processing || throttleSeconds > 0}>
                                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                        {throttleSeconds > 0 ? `Coba lagi dalam ${throttleSeconds} detik` : 'Kirim Link Reset'}
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
