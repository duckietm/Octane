import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SerialRequestChannel } from './SerialRequestChannel';

/** A channel whose clock and sleep the test drives. */
const channel = () => {
    let now = 0;
    const slept: number[] = [];
    const subject = new SerialRequestChannel(
        550,
        () => now,
        async (ms) => {
            slept.push(ms);
            now += ms;
        }
    );

    return { subject, slept, advance: (ms: number) => (now += ms) };
};

const reply = <R>() => {
    let resolve: (value: R) => void = () => undefined;
    const promise = new Promise<R>((done) => (resolve = done));

    return { promise, resolve };
};

describe('SerialRequestChannel', () => {
    it('sends the next request only once the previous one has its reply, and gives each reply to its own request', async () => {
        const { subject } = channel();
        const sent: string[] = [];
        const first = reply<string>();
        const second = reply<string>();

        const suggestions = subject.run(
            () => sent.push('suggest ab'),
            () => first.promise
        );
        const exact = subject.run(
            () => sent.push('exact ab'),
            () => second.promise
        );

        await Promise.resolve();
        expect(sent).toEqual(['suggest ab']);

        first.resolve('8 suggestions');
        await expect(suggestions).resolves.toBe('8 suggestions');
        await new Promise((done) => setTimeout(done, 0));
        expect(sent).toEqual(['suggest ab', 'exact ab']);

        second.resolve('the room');
        await expect(exact).resolves.toBe('the room');
    });

    it('keeps requests the rate limit apart', async () => {
        const { subject, slept } = channel();

        await subject.run(
            () => undefined,
            async () => 'a'
        );
        await subject.run(
            () => undefined,
            async () => 'b'
        );

        expect(slept).toEqual([550]);
    });

    it('skips a request aborted before it left, and the queue goes on', async () => {
        const { subject, advance } = channel();
        const controller = new AbortController();
        const sent: string[] = [];

        controller.abort();
        advance(1000);

        await expect(
            subject.run(
                () => sent.push('stale'),
                async () => 'x',
                controller.signal
            )
        ).rejects.toThrow('aborted');
        await expect(
            subject.run(
                () => sent.push('fresh'),
                async () => 'y'
            )
        ).resolves.toBe('y');
        expect(sent).toEqual(['fresh']);
    });

    it('carries the housekeeping room and user searches', () => {
        const source = readFileSync('src/api/housekeeping/HousekeepingApi.ts', 'utf8');

        expect(source.match(/roomListChannel\.run\(/g)).toHaveLength(2);
        expect(source).toContain('userSearchChannel.run(');
        expect(readFileSync('src/hooks/housekeeping/useHousekeepingStore.ts', 'utf8')).toContain('const AUTOCOMPLETE_DEBOUNCE_MS = 500;');
    });
});
