import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCount(count: number): { formatted: string; full: string } {
    const full = new Intl.NumberFormat('id-ID').format(count);
    if (count >= 1_000_000) {
        const millions = count / 1_000_000;
        const formatted = new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: millions >= 10 ? 0 : 1,
        }).format(millions) + ' jt';
        return { formatted, full };
    }
    return { formatted: full, full };
}
