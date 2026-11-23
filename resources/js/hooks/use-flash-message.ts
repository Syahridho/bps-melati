import { useCallback, useEffect, useRef, useState } from 'react';

export function useFlashMessage(flashMessage?: string | null, duration = 5000) {
    const [message, setMessage] = useState<string | null>(null);
    const lastRef = useRef<string | null>(null);
    const timerRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const show = useCallback(
        (text: string) => {
            clearTimer();
            setMessage(text);
            timerRef.current = window.setTimeout(() => {
                setMessage(null);
                lastRef.current = null;
                timerRef.current = null;
            }, duration);
        },
        [duration],
    );

    useEffect(() => {
        if (!flashMessage || flashMessage === lastRef.current) return;
        lastRef.current = flashMessage;
        show(flashMessage);
    }, [flashMessage, show]);

    useEffect(() => clearTimer, []);

    return { message, show };
}
