import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (! id.includes('node_modules')) {
                        return;
                    }

                    const normalized = id.replace(/\\/g, '/');

                    if (
                        normalized.includes('/node_modules/react/') ||
                        normalized.includes('/node_modules/react-dom/') ||
                        normalized.includes('/node_modules/scheduler/')
                    ) {
                        return 'react-vendor';
                    }

                    if (normalized.includes('/node_modules/@inertiajs/')) {
                        return 'inertia';
                    }

                    if (
                        normalized.includes('/node_modules/laravel-echo/') ||
                        normalized.includes('/node_modules/@laravel/echo-react/') ||
                        normalized.includes('/node_modules/pusher-js/')
                    ) {
                        return 'realtime';
                    }

                    if (
                        normalized.includes('/node_modules/recharts/') ||
                        normalized.includes('/node_modules/d3-') ||
                        normalized.includes('/node_modules/victory-vendor/')
                    ) {
                        return 'charts';
                    }

                    if (
                        normalized.includes('/node_modules/lucide-react/') ||
                        normalized.includes('/node_modules/@radix-ui/react-icons/')
                    ) {
                        return 'icons';
                    }

                    if (normalized.includes('/node_modules/@radix-ui/')) {
                        return 'ui-radix';
                    }

                    if (
                        normalized.includes('/node_modules/date-fns/') ||
                        normalized.includes('/node_modules/react-day-picker/')
                    ) {
                        return 'date';
                    }
                },
            },
        },
    },
});