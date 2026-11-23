import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RATE_LIMIT_NOTES } from '@/lib/api-docs-view';
import { Copy, Terminal } from 'lucide-react';
import { type ReactNode } from 'react';

interface ApiBasicInfoCardProps {
    baseUrl: string;
    apiKeyHeaderName: string;
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-muted/50 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">{label}</p>
            {children}
        </div>
    );
}

export function ApiBasicInfoCard({ baseUrl, apiKeyHeaderName }: ApiBasicInfoCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 shrink-0" />
                    Informasi Dasar
                </CardTitle>
                <CardDescription>
                    Konfigurasi dasar untuk mengakses API. Semua request harus menyertakan header {apiKeyHeaderName} dengan nilai API key yang valid.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoTile label="Base URL">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm break-all">{baseUrl}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </InfoTile>
                    <InfoTile label="Header API Key">
                        <span className="font-mono text-sm">{apiKeyHeaderName}</span>
                    </InfoTile>
                    <InfoTile label="Content-Type">
                        <span className="font-mono text-sm">application/json</span>
                    </InfoTile>
                    <InfoTile label="Rate Limit">
                        <ul className="text-muted-foreground space-y-1 text-sm">
                            {RATE_LIMIT_NOTES.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </InfoTile>
                </div>
            </CardContent>
        </Card>
    );
}
