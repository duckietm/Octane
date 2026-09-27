import { beforeEach, describe, expect, it } from 'vitest';
import { SOUNDBOARD_FEED_LIMIT, useSoundboardFeedStore } from './soundboardFeedStore';

describe('soundboard feed store', () => {
    beforeEach(() => useSoundboardFeedStore.getState().clear());

    it('keeps the newest plays first up to the limit and remembers the last sound', () => {
        const { push } = useSoundboardFeedStore.getState();

        for (let index = 1; index <= SOUNDBOARD_FEED_LIMIT + 2; index++) push({ username: `user${index}`, soundName: 'Click', soundId: index });

        const { entries, lastPlayed } = useSoundboardFeedStore.getState();
        expect(entries).toHaveLength(SOUNDBOARD_FEED_LIMIT);
        expect(entries[0].username).toBe(`user${SOUNDBOARD_FEED_LIMIT + 2}`);
        expect(lastPlayed?.soundId).toBe(SOUNDBOARD_FEED_LIMIT + 2);
    });

    it('dismisses a single entry', () => {
        const key = useSoundboardFeedStore.getState().push({ username: 'tester', soundName: 'Click', soundId: 1 });
        useSoundboardFeedStore.getState().push({ username: 'other', soundName: 'Ding', soundId: 2 });

        useSoundboardFeedStore.getState().dismiss(key);
        expect(useSoundboardFeedStore.getState().entries.map((entry) => entry.username)).toEqual(['other']);
    });
});
