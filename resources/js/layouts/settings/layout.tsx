import Heading from '@/components/atoms/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthRole } from '@/hooks/use-auth-role';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export default function SettingsLayout({
    title = 'Pengaturan',
    description = 'Kelola profil dan pengaturan akun Anda',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { isAdmin, isOperatorTim } = useAuthRole();
    const pageUrl = usePage().url;
    const currentPath = pageUrl.split('?')[0].split('#')[0];

    const sidebarNavItems: NavItem[] = [
        ...(isAdmin
            ? [
                  {
                      title: 'Penugasan',
                      url: '/settings/assignment',
                      icon: null,
                  },
                  {
                      title: 'Auto Close',
                      url: '/settings/auto-close',
                      icon: null,
                  },
                  {
                      title: 'Penilaian Pelapor',
                      url: '/settings/rating',
                      icon: null,
                  },
                  {
                      title: 'Sumber Kanal',
                      url: '/settings/sumber-kanal',
                      icon: null,
                  },
                  {
                      title: 'Sensor Kata Kasar',
                      url: '/settings/sensors',
                      icon: null,
                  },
                  {
                      title: 'Klasifikasi Komentar',
                      url: '/settings/comment-classifier',
                      icon: null,
                  },
                  {
                      title: 'Laporan & Tanda Tangan',
                      url: '/settings/recap',
                      icon: null,
                  },
                  {
                      title: 'API Dokumentasi',
                      url: '/settings/api',
                      icon: null,
                  },
                  {
                      title: 'Android',
                      url: '/settings/android',
                      icon: null,
                  },
              ]
            : []),
        ...(!isOperatorTim
            ? [
                  {
                      title: 'Notifikasi',
                      url: '/settings/notification',
                      icon: null,
                  },
              ]
            : []),
        {
            title: 'Kata Sandi',
            url: '/settings/password',
            icon: null,
        },
        {
            title: 'Tema',
            url: '/settings/appearance',
            icon: null,
        },
    ];

    return (
        <div className="px-4 py-6">
            <Heading title={title} description={description} />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted font-medium': currentPath === item.url,
                                })}
                            >
                                <Link href={item.url}>{item.title}</Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1">
                    <section className="space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
