import { describe, expect, it } from 'vitest';
import { createLatestRequest } from './latestRequest';

describe('createLatestRequest', () => {
    it('aborts the previous request when a new one starts', () => {
        const latest = createLatestRequest();
        const first = latest.start();
        const second = latest.start();

        expect(first.aborted).toBe(true);
        expect(second.aborted).toBe(false);
    });

    it('aborts the running request on demand', () => {
        const latest = createLatestRequest();
        const signal = latest.start();

        latest.abort();

        expect(signal.aborted).toBe(true);
    });
});
