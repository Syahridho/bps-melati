import RatingSetting from '@/components/organisms/settings/rating-setting';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type RatingSettingPageProps } from '@/types/settings';
import { Head, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface RatingSettingChangedEvent {
    enabled: boolean;
    changed_by?: string | null;
    changed_at?: string | null;
}

export default function PenilaianSettingsView() {
    const { ratingEnabled: initialRatingEnabled, auth } = usePage<RatingSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Penilaian Pelapor',
            href: route('settings.application.penilaian'),
        },
    ];

    const [ratingEnabled, setRatingEnabled] = useState<boolean>(initialRatingEnabled ?? false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setRatingEnabled(initialRatingEnabled ?? false);
    }, [initialRatingEnabled]);

    const submitRating = (enabled: boolean) => {
        router.patch(
            route('settings.application.rating'),
            { rating_enabled: enabled },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onSuccess: () => toast.success('Pengaturan penilaian disimpan'),
                onError: () => {
                    setRatingEnabled(!enabled);
                    toast.error('Gagal menyimpan pengaturan');
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleRatingToggle = (checked: boolean) => {
        setRatingEnabled(checked);
        submitRating(checked);
    };

    const isStaff = !!auth?.user;

    useEcho<RatingSettingChangedEvent>(
        isStaff ? 'staff' : '',
        '.rating.setting.changed',
        (event) => {
            setRatingEnabled(event.enabled);
        },
        [isStaff],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Penilaian Pelapor" />

            <SettingsLayout title="Penilaian Pelapor" description="Kelola pengaktifan rating bintang dan ulasan pelapor saat menutup laporan">
                <div className="space-y-6">
                    <RatingSetting enabled={ratingEnabled} processing={processing} onToggle={handleRatingToggle} />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
