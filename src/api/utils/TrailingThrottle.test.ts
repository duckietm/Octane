import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrailingThrottle } from './TrailingThrottle';

describe('TrailingThrottle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('sends the first request at once and only the latest of a burst after the interval', () => {
        const sent: string[] = [];
        const throttle = new TrailingThrottle(500);

        throttle.run(() => sent.push('a'));
        throttle.run(() => sent.push('ab'));
        throttle.run(() => sent.push('abc'));

        expect(sent).toEqual(['a']);

        vi.advanceTimersByTime(500);

        expect(sent).toEqual(['a', 'abc']);
    });

    it('keeps the interval after a delayed request too', () => {
        const sent: number[] = [];
        const throttle = new TrailingThrottle(500);

        throttle.run(() => sent.push(1));
        throttle.run(() => sent.push(2));
        vi.advanceTimersByTime(500);
        throttle.run(() => sent.push(3));

        expect(sent).toEqual([1, 2]);

        vi.advanceTimersByTime(500);

        expect(sent).toEqual([1, 2, 3]);
    });

    it('drops what is pending when cancelled', () => {
        const sent: number[] = [];
        const throttle = new TrailingThrottle(500);

        throttle.run(() => sent.push(1));
        throttle.run(() => sent.push(2));
        throttle.cancel();
        vi.advanceTimersByTime(1000);

        expect(sent).toEqual([1]);
    });

    it('paces the group members search', () => {
        const source = readFileSync('src/components/groups/views/GroupMembersView.tsx', 'utf8');

        expect(source).toContain('membersRequests.run(() => SendMessageComposer(new GroupMembersComposer(');
        expect(source.match(/new GroupMembersComposer\(/g)).toHaveLength(1);
    });
});
