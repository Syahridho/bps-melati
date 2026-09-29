import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { type ReactNode } from 'react';

interface AdminPageProps {
    title?: string;
    description?: string;
    breadcrumbs: BreadcrumbItem[];
    children?: ReactNode;
}

export default function AdminPage({ title, description, breadcrumbs, children }: AdminPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="px-4 py-6">
                {title && <Heading title={title} description={description} />}

                {children ?? (
                    <p className="text-sm text-muted-foreground">
                        Halaman {title?.toLowerCase() ?? 'ini'} — konten menyusul.
                    </p>
                )}
            </div>
        </AppLayout>
    );
}