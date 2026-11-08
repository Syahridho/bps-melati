import ApiView from '@/components/view/dashboard/settings/api';
import { usePage } from '@inertiajs/react';

export default function ApiSettingsPage() {
    const { baseUrl, apiKeyHeaderName } = usePage<{ baseUrl: string; apiKeyHeaderName: string }>().props;

    return (
        <>
            <ApiView baseUrl={baseUrl} apiKeyHeaderName={apiKeyHeaderName} />
        </>
    );
}
