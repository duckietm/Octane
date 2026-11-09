import { GetTicker, OctaneTicker } from '@octane/renderer';
import { GetConfigurationValue } from '../GetConfigurationValue';

// Milliseconds between frames of the room's animation clock (system.fps.animation, 24 Hz).
export const GetAnimationFrameInterval = (): number => 1000 / (GetConfigurationValue<number>('system.fps.animation', 24) || 24);

// Runs the callback on the room's animation clock instead of every render
// frame; returns the unsubscriber.
export const AddAnimationTickerCallback = (callback: () => void): (() => void) => {
    const interval = GetAnimationFrameInterval();
    let elapsed = interval;

    const update = (ticker: OctaneTicker) => {
        elapsed += ticker.deltaMS;

        if (elapsed < interval) return;

        // Keep the remainder so the cadence averages out to the clock rate.
        elapsed %= interval;
        callback();
    };

    GetTicker().add(update);

    return () => GetTicker().remove(update);
};
