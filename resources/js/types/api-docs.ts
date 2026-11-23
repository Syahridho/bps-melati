import { type API_ENDPOINTS } from '@/lib/api-docs';

export type ApiEndpoint = (typeof API_ENDPOINTS)[number];
export type ApiEndpointParam = ApiEndpoint['params'][number];
export type ApiEndpointError = ApiEndpoint['errors'][number];
export type ApiCodeExample = ApiEndpoint['codeExamples'][number];

export interface ApiStep {
    step: number | string;
    title: string;
    description: string;
    endpoint?: string | null;
}
