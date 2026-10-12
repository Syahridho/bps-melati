import { useEffect, useState } from 'react';

export function useLoginCooldown(throttleSeconds?: number) {
    const [remainingSeconds, setRemainingSeconds] = useState<number>(throttleSeconds ?? 0);
    const [cooldownUntil, setCooldownUntil] = useState<number>(() => (throttleSeconds ? Date.now() + throttleSeconds * 1000 : 0));

    useEffect(() => {
        if (cooldownUntil === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
            setRemainingSeconds(remaining);

            if (remaining === 0) {
                setCooldownUntil(0);
                window.clearInterval(timer);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [cooldownUntil]);

    const isThrottled = cooldownUntil > 0;

    const resetCooldown = () => {
        setCooldownUntil(0);
        setRemainingSeconds(0);
    };

    return { isThrottled, remainingSeconds, resetCooldown };
}
