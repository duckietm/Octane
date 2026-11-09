import { describe, expect, it } from 'vitest';
import { HOUSEKEEPING_NO_ANSWER_KEY, housekeepingFailureKey } from './HousekeepingApi';

describe('housekeepingFailureKey', () => {
    it('explains a timeout as a server that did not answer', () => {
        expect(housekeepingFailureKey(new Error('timeout'), 'housekeeping.list.failed')).toBe(HOUSEKEEPING_NO_ANSWER_KEY);
    });

    it('keeps the fallback for any other failure', () => {
        expect(housekeepingFailureKey(new Error('aborted'), 'housekeeping.list.failed')).toBe('housekeeping.list.failed');
        expect(housekeepingFailureKey('boom', 'housekeeping.list.failed')).toBe('housekeeping.list.failed');
    });
});
