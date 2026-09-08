import { GetTicker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { useFpsCounter } from '../../../../hooks/rooms/widgets/useFpsCounter';

const SAMPLE_INTERVAL_MS = 500;

/**
 * Frames-per-second read-out switched on by `:showstats` (official `RoomEngine.setFpsCounterEnabled`).
 * Samples the renderer ticker twice a second; the room keeps rendering underneath.
 */
export const FpsCounterView: FC<{}> = (props) => {
    const isEnabled = useFpsCounter();
    const [fps, setFps] = useState(0);

    useEffect(() => {
        if (!isEnabled) return;

        const sample = () => {
            const ticker = GetTicker();
            const value = ticker && Number.isFinite(ticker.FPS) ? ticker.FPS : 0;

            setFps(Math.round(value));
        };

        sample();

        const interval = window.setInterval(sample, SAMPLE_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [isEnabled]);

    if (!isEnabled) return null;

    return (
        <div className="octane-fps-counter" data-testid="fps-counter">
            {fps} fps
        </div>
    );
};
