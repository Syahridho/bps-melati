import { SettingsSubmitButton } from '@/components/molecules/settings-submit-button';
import RatingSetting from '@/components/organisms/settings/rating-setting';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { type RatingSettingPageProps } from '@/types/settings';
import { Head, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { FormEvent, useEffect, useState } from 'react';

interface RatingSettingChangedEvent {
    enabled: boolean;
    changed_by?: string | null;
    changed_at?: string | null;
}

export default function PenilaianSettingsView() {
    const { ratingEnabled: initialRatingEnabled, flash } = usePage<RatingSettingPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Penilaian Pelapor',
            href: route('settings.application.penilaian'),
        },
    ];

    const [ratingEnabled, setRatingEnabled] = useState<boolean>(initialRatingEnabled ?? false);
    const [processing, setProcessing] = useState(false);
    const [saved, setSaved] = useState(false);

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
                onSuccess: () => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleRatingToggle = (checked: boolean) => {
        setRatingEnabled(checked);
        submitRating(checked);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        submitRating(ratingEnabled);
    };

    useEcho<RatingSettingChangedEvent>(
        'staff',
        '.rating.setting.changed',
        (event) => {
            setRatingEnabled(event.enabled);
        },
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Penilaian Pelapor" />

            <SettingsLayout
                title="Penilaian Pelapor"
                description="Kelola pengaktifan rating bintang dan ulasan pelapor saat menutup laporan"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <RatingSetting
                        enabled={ratingEnabled}
                        processing={processing}
                        onToggle={handleRatingToggle}
                    />

                    <SettingsSubmitButton
                        processing={processing}
                        recentlySuccessful={saved}
                        successMessage={flash?.success}
                    />
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
