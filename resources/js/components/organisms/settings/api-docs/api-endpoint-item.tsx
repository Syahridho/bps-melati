import { MethodBadge } from '@/components/molecules/method-badge';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authLabel } from '@/lib/api-docs-view';
import { type ApiEndpoint } from '@/types/api-docs';

import { CodeBlock } from '@/components/organisms/settings/code-block';
import { ApiParamsTable } from './api-params-table';

const SECTION_TITLE = 'text-muted-foreground text-xs font-semibold tracking-wider uppercase';
const SUBCARD = 'border-muted/50 bg-muted/50 dark:bg-muted/30 rounded-lg border p-3';

export function ApiEndpointItem({ endpoint }: { endpoint: ApiEndpoint }) {
    return (
        <AccordionItem value={endpoint.id}>
            <AccordionTrigger className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{endpoint.title}</span>
                    <span className="text-muted-foreground text-xs font-medium">{endpoint.path}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MethodBadge method={endpoint.method} />
                    <Badge variant="outline" className="text-xs">
                        {authLabel(endpoint.auth)}
                    </Badge>
                    {endpoint.rateLimit && (
                        <Badge variant="secondary" className="text-xs">
                            {endpoint.rateLimit}
                        </Badge>
                    )}
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
                <p className="text-muted-foreground mb-4 text-sm">{endpoint.description}</p>

                <div className="space-y-4">
                    <div className="border-muted/50 rounded-lg border p-4">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold">Parameter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ApiParamsTable params={endpoint.params} />
                        </CardContent>
                    </div>

                    <div className="space-y-2">
                        <h4 className={SECTION_TITLE}>Contoh Respons Sukses</h4>
                        <CodeBlock code={endpoint.success.body} label="200/201" language="json" />
                    </div>

                    {endpoint.errors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className={SECTION_TITLE}>Contoh Respons Error</h4>
                            {endpoint.errors.map((err, i) => (
                                <div key={i} className={SUBCARD}>
                                    <p className="text-destructive mb-1 text-xs font-medium dark:text-rose-400">
                                        {err.statusCode} – {err.description}
                                    </p>
                                    <CodeBlock code={err.body} label="Error" language="json" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2">
                        <h4 className={SECTION_TITLE}>Contoh Kode</h4>
                        {endpoint.codeExamples.map((ex, i) => (
                            <div key={i} className={SUBCARD}>
                                <p className="text-muted-foreground mb-2 text-xs font-medium">{ex.label}</p>
                                <CodeBlock code={ex.code} label={ex.label} />
                            </div>
                        ))}
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
