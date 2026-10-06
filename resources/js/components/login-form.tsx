import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginForm {
    email: string;
    password: string;
    [key: string]: string;
}

interface LoginProps {
    status?: string;
}

export default function LoginForm({ status }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 md:p-10">
            <Head title="Log in" />

            <div className="w-full max-w-sm md:max-w-3xl">
                <Card className="overflow-hidden p-0">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        <div className="from-primary/10 via-primary/5 dark:from-primary/20 dark:via-primary/10 relative hidden bg-gradient-to-br to-transparent md:flex md:items-center md:justify-center dark:to-transparent">
                            <img src="/logo-melati.webp" alt="Logo" className="h-44 w-44 drop-shadow-lg dark:brightness-90" />
                        </div>
                        <form className="p-6 md:p-8" onSubmit={submit}>
                            <div className="flex min-h-[350px] flex-col justify-center gap-6">
                                <div className="flex flex-col items-center text-center">
                                    <h1 className="text-2xl font-bold">Selamat Datang</h1>
                                    <p className="text-muted-foreground text-balance">Masuk ke akun melati Anda</p>
                                </div>

                                {status && <div className="text-center text-sm font-medium text-green-600">{status}</div>}

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="Masukkan email Anda"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="Masukkan password Anda"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <Button type="submit" className="w-full" tabIndex={3} disabled={processing}>
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Login
                                </Button>
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
