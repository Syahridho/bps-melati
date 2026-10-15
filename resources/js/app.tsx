import '../css/app.css';

import { SessionProvider } from '@/components/session-provider';
import { createInertiaApp } from '@inertiajs/react';
import { configureEcho } from '@laravel/echo-react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { TooltipProvider } from './components/ui/tooltip';
import { initializeTheme } from './hooks/use-appearance';

configureEcho({
    broadcaster: 'reverb',
});

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // SessionProvider berada di luar konteks Inertia, jadi id user awal
        // harus diteruskan lewat prop, bukan diambil dengan usePage().
        const initialUserId = readInitialUserId(props.initialPage.props);

        root.render(
            <SessionProvider initialUserId={initialUserId}>
                <TooltipProvider delayDuration={0}>
                    <App {...props} />
                </TooltipProvider>
            </SessionProvider>,
        );
    },
    progress: {
        color: '#005fb6',
    },
});

// This will set light / dark mode on load...
initializeTheme();

function readInitialUserId(props: unknown): number | null {
    if (typeof props !== 'object' || props === null) {
        return null;
    }

    const auth = (props as { auth?: { user?: { id?: unknown } } }).auth;
    const id = auth?.user?.id;

    return typeof id === 'number' ? id : null;
}
