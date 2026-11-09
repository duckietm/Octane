import { useEffect, useState } from 'react';

export const useDevicePixelRatio = () => {
    const [devicePixelRatio, setDevicePixelRatio] = useState(() => window.devicePixelRatio);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;

        let disposed = false;
        let media: MediaQueryList = null;
        let onChange: () => void = null;

        const arm = () => {
            if (disposed) return;

            media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

            onChange = () => {
                media.removeEventListener('change', onChange);
                setDevicePixelRatio(window.devicePixelRatio);
                arm();
            };

            media.addEventListener('change', onChange);
        };

        arm();

        return () => {
            disposed = true;
            if (media && onChange) media.removeEventListener('change', onChange);
        };
    }, []);

    return devicePixelRatio;
};
