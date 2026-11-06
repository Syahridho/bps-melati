import { useSyncExternalStore } from 'react';

export type Appearance = 'light' | 'dark';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function getSnapshot(): Appearance {
    if (typeof window === 'undefined') {
        return 'light';
    }

    const stored = localStorage.getItem('appearance');
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot(): Appearance {
    return 'light';
}

export function initializeTheme() {
    const mode = getSnapshot();
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
}

export function updateAppearance(mode: Appearance) {
    localStorage.setItem('appearance', mode);
    document.cookie = `appearance=${mode};path=/;max-age=31536000;SameSite=Lax`;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
    listeners.forEach((listener) => listener());
}

export function useAppearance() {
    const appearance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return { appearance, updateAppearance };
}
