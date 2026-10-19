import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserInfo } from '@/components/user-info';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, LogOut, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const [passwordOpen, setPasswordOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);

    // Password form state
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handlePasswordSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setPasswordOpen(false);
                toast.success('Kata sandi berhasil diperbarui', {
                    description: 'Akun Anda sekarang menggunakan kata sandi baru.',
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                }
                if (errs.current_password) {
                    reset('current_password');
                }
                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui kata sandi', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    const handlePasswordDialogChange = (open: boolean) => {
        setPasswordOpen(open);
        if (!open) {
            reset();
            clearErrors();
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        }
    };

    // Appearance hook
    const { appearance, updateAppearance } = useAppearance();

    const appearanceOptions: { value: Appearance; label: string; icon: typeof Sun; description: string }[] = [
        { value: 'light', label: 'Terang', icon: Sun, description: 'Tampilan terang dan bersih' },
        { value: 'dark', label: 'Gelap', icon: Moon, description: 'Nyaman untuk mata di tempat redup' },
        { value: 'system', label: 'Sistem', icon: Monitor, description: 'Menyesuaikan pengaturan perangkat' },
    ];

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
                onSelect={(e) => {
                    e.preventDefault();
                    cleanup();
                    setPasswordOpen(true);
                }}
                className="cursor-pointer"
            >
                <KeyRound className="mr-2 size-4" />
                Ubah Kata Sandi
            </DropdownMenuItem>

            <DropdownMenuItem
                onSelect={(e) => {
                    e.preventDefault();
                    cleanup();
                    setAppearanceOpen(true);
                }}
                className="cursor-pointer"
            >
                <Palette className="mr-2 size-4" />
                Tema
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2 size-4" />
                    Log out
                </Link>
            </DropdownMenuItem>

            {/* Dialog Ubah Kata Sandi */}
            <Dialog open={passwordOpen} onOpenChange={handlePasswordDialogChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Kata Sandi</DialogTitle>
                        <DialogDescription>Pastikan akun Anda menggunakan kata sandi yang panjang dan acak agar tetap aman.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="current_password">Kata Sandi Saat Ini</Label>
                            <div className="relative">
                                <Input
                                    id="current_password"
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

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => handlePasswordDialogChange(false)} disabled={processing}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                                Simpan Kata Sandi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Tema */}
            <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pengaturan Tema</DialogTitle>
                        <DialogDescription>Pilih tema tampilan antarmuka sesuai kenyamanan Anda.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-2">
                        {appearanceOptions.map(({ value, label, icon: Icon, description }) => {
                            const isActive = appearance === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => updateAppearance(value)}
                                    className={`flex items-center justify-between rounded-lg border p-4 text-left transition-all ${
                                        isActive
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10'
                                            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`rounded-md p-2 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{label}</p>
                                            <p className="text-muted-foreground text-xs">{description}</p>
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
                                            <Check className="size-3.5 stroke-[3]" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" onClick={() => setAppearanceOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
