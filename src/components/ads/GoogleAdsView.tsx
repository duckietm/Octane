import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { configFileUrl } from '../../secure-assets';

interface AdsenseConfig {
    slot: string;
    format?: string;
    fullWidthResponsive?: boolean;
}

const parsePublisherIdFromAdsTxt = (text: string): string | null => {
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.split('#')[0].trim();
        if (!line) continue;
        const parts = line.split(',').map((part) => part.trim());
        if (parts.length < 2) continue;
        if (parts[0].toLowerCase() !== 'google.com') continue;
        const pub = parts[1];
        if (/^pub-\d+$/.test(pub)) return pub;
    }
    return null;
};

export const GoogleAdsView: FC<{}> = () => {
    const adsEnabled = GetConfigurationValue<boolean>('show.google.ads', false);
    const [isOpen, setIsOpen] = useState(false);
    const [publisherId, setPublisherId] = useState<string | null>(null);
    const [config, setConfig] = useState<AdsenseConfig | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const insRef = useRef<HTMLModElement>(null);
    const pushedRef = useRef(false);
    const autoOpenedRef = useRef(false);

    useEffect(() => {
        if (!adsEnabled) return;
        const handler = () => setIsOpen((prev) => !prev);
        window.addEventListener('ads:toggle', handler);
        return () => window.removeEventListener('ads:toggle', handler);
    }, [adsEnabled]);

    // Auto-open once on initial mount (the login / landing stage).
    // Subsequent toggles are driven by the "ads:toggle" window event
    // (e.g. the Show Ad button in OctaneSystemAlertView).
    useEffect(() => {
        if (!adsEnabled) return;
        if (autoOpenedRef.current) return;
        autoOpenedRef.current = true;
        const t = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(t);
    }, [adsEnabled]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [adsTxtRes, configRes] = await Promise.all([
                    fetch('/ads.txt', { cache: 'no-cache' }),
                    fetch(configFileUrl('adsense.json', true), { cache: 'no-cache' })
                ]);

                if (!adsTxtRes.ok) throw new Error(`ads.txt ${adsTxtRes.status}`);

                const adsTxt = await adsTxtRes.text();
                const pubId = parsePublisherIdFromAdsTxt(adsTxt);

                if (!pubId) throw new Error('No google.com publisher id in ads.txt');

                let cfg: AdsenseConfig = { slot: '', format: 'auto', fullWidthResponsive: true };
                if (configRes.ok) cfg = { ...cfg, ...(await configRes.json()) };

                if (cancelled) return;
                setPublisherId(pubId);
                setConfig(cfg);
            } catch (err) {
                if (!cancelled) setLoadError((err as Error).message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            pushedRef.current = false;
            return;
        }
        if (!insRef.current || pushedRef.current) return;
        if (!publisherId || !config?.slot) return;

        const tryPush = () => {
            try {
                const w = window as any;
                w.adsbygoogle = w.adsbygoogle || [];
                w.adsbygoogle.push({});
                pushedRef.current = true;
            } catch {
                // AdSense script may not be ready yet; retry once
                setTimeout(() => {
                    try {
                        const w = window as any;
                        w.adsbygoogle = w.adsbygoogle || [];
                        w.adsbygoogle.push({});
                        pushedRef.current = true;
                    } catch {
                        /* give up */
                    }
                }, 500);
            }
        };

        const t = setTimeout(tryPush, 50);
        return () => clearTimeout(t);
    }, [isOpen, publisherId, config]);

    if (!adsEnabled) return null;
    if (!isOpen) return null;

    return (
        <OctaneCardView className="octane-google-ads" uniqueKey="google-ads" theme="primary">
            {publisherId && (
                <script async crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}`} />
            )}
            <OctaneCardHeaderView headerText="Sponsored" onCloseClick={() => setIsOpen(false)} />
            <OctaneCardContentView>
                <div className="flex items-center justify-center w-[300px] h-[250px] bg-white">
                    {loadError && <div className="text-xs text-red-600 text-center px-2">Ads unavailable: {loadError}</div>}
                    {!loadError && (!publisherId || !config) && <div className="text-xs text-gray-500">Loading…</div>}
                    {!loadError && publisherId && config?.slot && (
                        <ins
                            ref={insRef}
                            key={`${publisherId}-${config.slot}`}
                            className="adsbygoogle"
                            style={{ display: 'block', width: '100%', height: '100%' }}
                            data-ad-client={`ca-${publisherId}`}
                            data-ad-slot={config.slot}
                            data-ad-format={config.format ?? 'auto'}
                            data-full-width-responsive={(config.fullWidthResponsive ?? true) ? 'true' : 'false'}
                        />
                    )}
                    {!loadError && publisherId && config && !config.slot && (
                        <div className="text-xs text-gray-500 text-center px-2">Ad slot not configured in configuration/adsense.json</div>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
