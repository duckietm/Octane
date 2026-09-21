import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddAnimationTickerCallback } from './AddAnimationTickerCallback';

const tickerMocks = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn() }));

vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({ getValue: (_key: string, value: unknown) => value }),
    GetTicker: () => tickerMocks
}));

beforeEach(() => vi.clearAllMocks());

describe('AddAnimationTickerCallback', () => {
    it('fires on the first frame and then at the animation clock rate', () => {
        const callback = vi.fn();

        AddAnimationTickerCallback(callback);

        const update = tickerMocks.add.mock.calls[0][0] as (ticker: { deltaMS: number }) => void;

        update({ deltaMS: 0 });

        expect(callback).toHaveBeenCalledTimes(1);

        for (let frame = 0; frame < 60; frame++) update({ deltaMS: 1000 / 60 });

        expect(callback).toHaveBeenCalledTimes(25);
    });

    it('does not replay frames missed while the ticker was stalled', () => {
        const callback = vi.fn();

        AddAnimationTickerCallback(callback);

        const update = tickerMocks.add.mock.calls[0][0] as (ticker: { deltaMS: number }) => void;

        update({ deltaMS: 5000 });
        update({ deltaMS: 1 });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('removes its ticker callback on unsubscribe', () => {
        const unsubscribe = AddAnimationTickerCallback(vi.fn());
        const update = tickerMocks.add.mock.calls[0][0];

        unsubscribe();

        expect(tickerMocks.remove).toHaveBeenCalledWith(update);
    });
});
