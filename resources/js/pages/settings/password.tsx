import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { toast } from 'sonner';

// import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ubah Kata Sandi',
        href: '/settings/password',
    },
];

export default function PasswordPage() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, errors, put, reset, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success('Kata sandi berhasil diperbarui', {
                    description: 'Akun Anda sekarang menggunakan kata sandi baru.',
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }

                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui kata sandi', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ubah Kata Sandi" />

            <SettingsLayout title="Ubah Kata Sandi" description="Pastikan akun Anda menggunakan kata sandi yang panjang dan acak agar tetap aman.">
                <form onSubmit={updatePassword} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="current_password">Kata Sandi Saat Ini</Label>
                        <div className="relative">
                            <Input
                                id="current_password"
                                ref={currentPasswordInput}
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                placeholder="Masukkan kata sandi saat ini"
                                className="pr-10"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                                tabIndex={-1}
                            >
                                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.current_password && <p className="text-destructive text-xs">{errors.current_password}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Kata Sandi Baru</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                ref={passwordInput}
                                type={showNewPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Masukkan kata sandi baru"
                                className="pr-10"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                                tabIndex={-1}
                            >
                                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation">Konfirmasi Kata Sandi Baru</Label>
                        <div className="relative">
                            <Input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="Ulangi kata sandi baru"
                                className="pr-10"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.password_confirmation && <p className="text-destructive text-xs">{errors.password_confirmation}</p>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
