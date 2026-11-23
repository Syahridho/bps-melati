import { ApiBasicInfoCard } from '@/components/organisms/settings/api-docs/api-basic-info-card';
import { ApiEndpointItem } from '@/components/organisms/settings/api-docs/api-endpoint-item';

import { ApiErrorCodesTable } from '@/components/organisms/settings/api-docs/api-error-codes-table';
import { ApiStepsList } from '@/components/organisms/settings/api-docs/api-steps-list';
import { CodeBlock } from '@/components/organisms/settings/code-block';
import { Accordion } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { API_ENDPOINTS, MOBILE_AUTH_GUIDE, QUICK_START_STEPS, TICKET_NUMBER_NOTE } from '@/lib/api-docs';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Headphones, Link as LinkIcon, Lock, Play, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const INTRO = 'text-muted-foreground text-sm';

export default function ApiSettingsView() {
    const { baseUrl, apiKeyHeaderName } = usePage<{ baseUrl: string; apiKeyHeaderName: string }>().props;
    const [activeTab, setActiveTab] = useState('quick-start');

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'API Dokumentasi', href: route('settings.api') }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dokumentasi API" />
            <SettingsLayout
                title="API Dokumentasi"
                description="Referensi lengkap untuk integrasi aplikasi klien (Flutter, sistem eksternal, dll) dengan API Melati."
            >
                <div className="space-y-6">
                    <ApiBasicInfoCard baseUrl={baseUrl} apiKeyHeaderName={apiKeyHeaderName} />

                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <AlertTitle>Peringatan Keamanan</AlertTitle>
                        <AlertDescription className="text-sm">
                            API key disimpan di file <span className="font-mono text-xs">.env</span> pada server dan{' '}
                            <strong>tidak ditampilkan di halaman ini</strong>. Nilai API key tidak ada dalam props Inertia, HTML, atau bundle
                            JavaScript.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full justify-start">
                                <TabsTrigger value="quick-start" className="flex-1">
                                    <Play className="mr-2 h-4 w-4" /> Panduan Cepat
                                </TabsTrigger>
                                <TabsTrigger value="endpoints" className="flex-1">
                                    <LinkIcon className="mr-2 h-4 w-4" /> Referensi Endpoint
                                </TabsTrigger>
                                <TabsTrigger value="mobile-auth" className="flex-1">
                                    <Headphones className="mr-2 h-4 w-4" /> Autentikasi Mobile
                                </TabsTrigger>
                                <TabsTrigger value="errors" className="flex-1">
                                    <Lock className="mr-2 h-4 w-4" /> Kode Error &amp; Batas
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="quick-start" className="space-y-4">
                                <p className={INTRO}>Ikuti langkah-langkah berikut untuk mulai mengintegrasikan aplikasi Anda dengan API Melati.</p>
                                <ApiStepsList steps={QUICK_START_STEPS} />
                            </TabsContent>

                            <TabsContent value="endpoints" className="space-y-4">
                                <p className={INTRO}>
                                    Setiap endpoint dijelaskan lengkap dengan parameter, contoh respons, dan kode dalam berbagai bahasa.
                                </p>
                                <Accordion type="multiple" className="w-full space-y-1">
                                    {API_ENDPOINTS.map((endpoint) => (
                                        <ApiEndpointItem key={endpoint.id} endpoint={endpoint} />
                                    ))}
                                </Accordion>
                                <div className="border-muted/50 bg-muted/50 dark:bg-muted/30 rounded-lg border p-4">
                                    <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Catatan Nomor Tiket</h4>
                                    <p className="text-muted-foreground mb-2 text-sm">{TICKET_NUMBER_NOTE.description}</p>
                                    {TICKET_NUMBER_NOTE.examples.map((ex, i) => (
                                        <CodeBlock key={i} code={ex.code} label={ex.label} language="text" />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="mobile-auth" className="space-y-4">
                                <p className={INTRO}>
                                    Panduan untuk klien mobile (Flutter/Android) menggunakan autentikasi Bearer token via Sanctum.
                                </p>
                                <ApiStepsList steps={MOBILE_AUTH_GUIDE} />
                            </TabsContent>

                            <TabsContent value="errors" className="space-y-4">
                                <p className={INTRO}>Daftar kode respons error yang dapat dikembalikan API dan cara menangani masing-masing.</p>
                                <ApiErrorCodesTable />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
