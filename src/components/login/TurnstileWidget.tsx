import { FC, useEffect, useEffectEvent, useRef, useState } from 'react';
import { loadTurnstileScript } from './loadTurnstileScript';

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

export interface TurnstileWidgetProps {
    siteKey: string;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
    onToken: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    resetSignal?: number;
}

export const TurnstileWidget: FC<TurnstileWidgetProps> = (props) => {
    const { siteKey, theme = 'light', size = 'normal', onToken, onExpire, onError, resetSignal = 0 } = props;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptReady, setScriptReady] = useState<boolean>(typeof window !== 'undefined' && !!window.turnstile);

    const handleToken = useEffectEvent((token: string) => onToken(token));
    const handleExpire = useEffectEvent(() => onExpire?.());
    const handleError = useEffectEvent(() => onError?.());

    useEffect(() => {
        if (scriptReady) return;
        if (typeof window === 'undefined') return;

        let cancelled = false;

        // Fetched here rather than from index.html, so a hotel with the check off never
        // loads Cloudflare's script at all - and a blocked one gives up instead of
        // polling for as long as the login screen is open.
        loadTurnstileScript().then((loaded) => {
            if (cancelled) return;

            if (loaded) setScriptReady(true);
            else handleError();
        });

        return () => {
            cancelled = true;
        };
    }, [scriptReady]);

    useEffect(() => {
        if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: handleToken,
            'expired-callback': handleExpire,
            'error-callback': handleError
        });

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {}
                widgetIdRef.current = null;
            }
        };
    }, [scriptReady, siteKey, theme, size]);

    useEffect(() => {
        if (resetSignal <= 0) return;
        if (widgetIdRef.current && window.turnstile) {
            try {
                window.turnstile.reset(widgetIdRef.current);
            } catch {}
        }
    }, [resetSignal]);

    if (!siteKey) return null;

    return <div ref={containerRef} className="turnstile-slot" />;
};
