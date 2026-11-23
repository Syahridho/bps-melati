import { Badge } from '@/components/ui/badge';
import { findEndpointPath } from '@/lib/api-docs-view';
import { type ApiStep } from '@/types/api-docs';

export function ApiStepsList({ steps }: { steps: readonly ApiStep[] }) {
    return (
        <>
            {steps.map((step) => (
                <div key={step.step} className="flex gap-3">
                    <div className="flex-shrink-0">
                        <Badge variant="secondary" className="flex h-8 w-8 items-center justify-center">
                            {step.step}
                        </Badge>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">{step.title}</h4>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                        {step.endpoint && <p className="text-muted-foreground mt-1 font-mono text-xs">Endpoint: {findEndpointPath(step.endpoint)}</p>}
                    </div>
                </div>
            ))}
        </>
    );
}
