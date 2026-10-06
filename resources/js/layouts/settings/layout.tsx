import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export default function SettingsLayout({
    title = 'Settings',
    description = 'Manage your profile and account settings',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { auth } = usePage<SharedData>().props;
    const pageUrl = usePage().url;
    const currentPath = pageUrl.split('?')[0].split('#')[0];

    const role = auth?.user?.role;
    const appSettingUrl = role === 'admin' ? '/dashboard/admin/pengaturan' : role === 'operator' ? '/dashboard/operator/pengaturan' : null;

    const sidebarNavItems: NavItem[] = [
        ...(appSettingUrl
            ? [
                  {
                      title: 'Pengaturan Aplikasi',
                      url: appSettingUrl,
                      icon: null,
                  },
              ]
            : []),
        {
            title: 'Password',
            url: '/settings/password',
            icon: null,
        },
        {
            title: 'Appearance',
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
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
