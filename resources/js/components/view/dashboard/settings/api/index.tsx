import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from './CodeBlock';
import {
    API_ENDPOINTS,
    API_ERROR_CODES,
    MOBILE_AUTH_GUIDE,
    QUICK_START_STEPS,
    TICKET_NUMBER_NOTE,
} from '@/lib/api-docs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Headphones, Link as LinkIcon, Lock, Play, ShieldAlert, Terminal } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface ApiSettingsProps {
    baseUrl: string;
    apiKeyHeaderName: string;
}

export default function ApiSettingsView({ baseUrl, apiKeyHeaderName }: ApiSettingsProps) {
    const [activeTab, setActiveTab] = useState('quick-start');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Pengaturan',
            href: route('settings.application.edit'),
        },
        {
            title: 'API',
            href: route('settings.api'),
        },
    ];

    const methodBadge = (method: string) => {
        const variants: Record<string, string> = {
            GET: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
            POST: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
            DELETE: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
        };
        return (
            <Badge variant="outline" className={variants[method] ?? 'bg-muted text-muted-foreground'}>
                {method}
            </Badge>
        );
    };

    const renderParams = (params: (typeof API_ENDPOINTS)[number]['params']) => {
        if (params.length === 0) {
            return <p className="text-xs text-muted-foreground">Tidak ada parameter.</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-muted/50">
                            <th className="text-left pb-2 font-medium text-muted-foreground w-24">Nama</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground w-20">Lokasi</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground w-20">Tipe</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground w-16">Wajib</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground">Deskripsi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {params.map((param) => (
                            <tr key={param.name} className="border-b border-muted/50 last:border-0">
                                <td className="pb-3 font-mono text-xs">{param.name}</td>
                                <td className="pb-3 text-xs">
                                    <Badge variant="outline" className="h-5 w-fit px-1.5">
                                        {param.location}
                                    </Badge>
                                </td>
                                <td className="pb-3 font-mono text-xs">{param.type}</td>
                                <td className="pb-3 text-xs">
                                    {param.required ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ya</span>
                                    ) : (
                                        <span className="text-muted-foreground">Tidak</span>
                                    )}
                                </td>
                                <td className="pb-3 text-xs">{param.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderEndpointItem = (endpoint: (typeof API_ENDPOINTS)[number]) => {
        return (
            <AccordionItem key={endpoint.id} value={endpoint.id}>
                <AccordionTrigger className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{endpoint.title}</span>
                        <span className="text-xs font-medium text-muted-foreground">{endpoint.path}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {methodBadge(endpoint.method)}
                        <Badge variant="outline" className="text-xs">
                            {endpoint.auth === 'api-key' ? 'API Key' : endpoint.auth === 'bearer' ? 'Bearer' : 'Tidak perlu'}
                        </Badge>
                        {endpoint.rateLimit && (
                            <Badge variant="secondary" className="text-xs">
                                {endpoint.rateLimit}
                            </Badge>
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-4">
                    <p className="text-sm text-muted-foreground mb-4">{endpoint.description}</p>

                    <div className="space-y-4">
                        <div className="border border-muted/50 rounded-lg p-4">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold">Parameter</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {renderParams(endpoint.params)}
                            </CardContent>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contoh Respons Sukses</h4>
                            <CodeBlock code={endpoint.success.body} label="200/201" language="json" />
                        </div>

                        {endpoint.errors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contoh Respons Error</h4>
                                {endpoint.errors.map((err: (typeof API_ENDPOINTS)[number]['errors'][number], i: number) => (
                                    <div key={i} className="border border-muted/50 rounded-lg p-3 bg-muted/50 dark:bg-muted/30">
                                        <p className="text-xs font-medium text-destructive dark:text-rose-400 mb-1">
                                            {err.statusCode} – {err.description}
                                        </p>
                                        <CodeBlock code={err.body} label="Error" language="json" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contoh Kode</h4>
                            {endpoint.codeExamples.map((ex: (typeof API_ENDPOINTS)[number]['codeExamples'][number], i: number) => (
                                <div key={i} className="border border-muted/50 rounded-lg p-3 bg-muted/50 dark:bg-muted/30">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{ex.label}</p>
                                    <CodeBlock code={ex.code} label={ex.label} />
                                </div>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dokumentasi API" />
            <SettingsLayout
                title="Pengaturan API"
                description="Referensi lengkap untuk integrasi aplikasi klien (Flutter, sistem eksternal, dll) dengan API Melati."
            >
                <div className="space-y-6">
                    {/* Card Informasi Dasar */}
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5 shrink-0" />
                                Informasi Dasar
                            </CardTitle>
                            <CardDescription>
                                Konfigurasi dasar untuk mengakses API. Semua request harus menyertakan header
                                {apiKeyHeaderName} dengan nilai API key yang valid.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-muted/50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Base URL
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm break-all">{baseUrl}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="border border-muted/50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Header API Key
                                    </p>
                                    <span className="font-mono text-sm">{apiKeyHeaderName}</span>
                                </div>
                                <div className="border border-muted/50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Content-Type
                                    </p>
                                    <span className="font-mono text-sm">application/json</span>
                                </div>
                                <div className="border border-muted/50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Rate Limit
                                    </p>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>Tiket baru: 5/menit</li>
                                        <li>Cek tiket: 20/menit</li>
                                        <li>Balas/Selesaikan: 10/menit</li>
                                        <li>Login token: 10/menit</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alert Keamanan */}
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <AlertTitle>Peringatan Keamanan</AlertTitle>
                        <AlertDescription className="text-sm">
                            API key disimpan di file <span className="font-mono text-xs">.env</span> pada server dan{' '}
                            <strong>tidak ditampilkan di halaman ini</strong>. Nilai API key tidak ada dalam props Inertia, HTML,
                            atau bundle JavaScript.
                        </AlertDescription>
                    </Alert>

                    {/* Tabs Besar */}
                    <div className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full justify-start">
                                <TabsTrigger value="quick-start" className="flex-1">
                                    <Play className="h-4 w-4 mr-2" /> Panduan Cepat
                                </TabsTrigger>
                                <TabsTrigger value="endpoints" className="flex-1">
                                    <LinkIcon className="h-4 w-4 mr-2" /> Referensi Endpoint
                                </TabsTrigger>
                                <TabsTrigger value="mobile-auth" className="flex-1">
                                    <Headphones className="h-4 w-4 mr-2" /> Autentikasi Mobile
                                </TabsTrigger>
                                <TabsTrigger value="errors" className="flex-1">
                                    <Lock className="h-4 w-4 mr-2" /> Kode Error &amp; Batas
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab: Panduan Cepat */}
                            <TabsContent value="quick-start" className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Ikuti langkah-langkah berikut untuk mulai mengintegrasikan aplikasi Anda dengan API Melati.
                                </p>
                                {QUICK_START_STEPS.map((step) => (
                                    <div key={step.step} className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <Badge variant="secondary" className="h-8 w-8 flex items-center justify-center">
                                                {step.step}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm">{step.title}</h4>
                                            <p className="text-sm text-muted-foreground">{step.description}</p>
                                            {step.endpoint && (
                                                <p className="text-xs font-mono text-muted-foreground mt-1">
                                                    Endpoint: {API_ENDPOINTS.find((e) => e.id === step.endpoint)?.path}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>

                            {/* Tab: Referensi Endpoint */}
                            <TabsContent value="endpoints" className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Setiap endpoint dijelaskan lengkap dengan parameter, contoh respons, dan kode dalam berbagai bahasa.
                                </p>
                                <Accordion type="multiple" className="w-full space-y-1">
                                    {API_ENDPOINTS.map(renderEndpointItem)}
                                </Accordion>
                                <div className="border border-muted/50 rounded-lg p-4 bg-muted/50 dark:bg-muted/30">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Catatan Nomor Tiket
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {TICKET_NUMBER_NOTE.description}
                                    </p>
                                    {TICKET_NUMBER_NOTE.examples.map((ex, i) => (
                                        <CodeBlock key={i} code={ex.code} label={ex.label} language="text" />
                                    ))}
                                </div>
                            </TabsContent>

                            {/* Tab: Autentikasi Mobile */}
                            <TabsContent value="mobile-auth" className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Panduan untuk klien mobile (Flutter/Android) menggunakan autentikasi Bearer token via Sanctum.
                                </p>
                                {MOBILE_AUTH_GUIDE.map((step) => (
                                    <div key={step.step} className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <Badge variant="secondary" className="h-8 w-8 flex items-center justify-center">
                                                {step.step}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm">{step.title}</h4>
                                            <p className="text-sm text-muted-foreground">{step.description}</p>
                                            {step.endpoint && (
                                                <p className="text-xs font-mono text-muted-foreground mt-1">
                                                    Endpoint: {API_ENDPOINTS.find((e) => e.id === step.endpoint)?.path}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>

                            {/* Tab: Kode Error */}
                            <TabsContent value="errors" className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Daftar kode respons error yang dapat dikembalikan API dan cara menangani masing-masing.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-muted/50">
                                                <th className="text-left pb-2 font-medium text-muted-foreground w-16">Kode</th>
                                                <th className="text-left pb-2 font-medium text-muted-foreground w-24">Nama</th>
                                                <th className="text-left pb-2 font-medium text-muted-foreground">Deskripsi</th>
                                                <th className="text-left pb-2 font-medium text-muted-foreground w-32">Contoh Body</th>
                                                <th className="text-left pb-2 font-medium text-muted-foreground">Catatan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {API_ERROR_CODES.map((err) => (
                                                <tr key={err.code} className="border-b border-muted/50 last:border-0">
                                                    <td className="pb-3 font-mono text-xs">{err.code}</td>
                                                    <td className="pb-3 text-xs font-medium">{err.name}</td>
                                                    <td className="pb-3 text-xs">{err.description}</td>
                                                    <td className="pb-3 font-mono text-xs text-muted-foreground truncate max-w-40">
                                                        {err.exampleBody}
                                                    </td>
                                                    <td className="pb-3 text-xs">{err.note ?? '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
