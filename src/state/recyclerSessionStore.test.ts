import { beforeEach, describe, expect, it } from 'vitest';
import { useRecyclerSessionStore } from './recyclerSessionStore';

describe('recycler session store', () => {
    beforeEach(() => useRecyclerSessionStore.setState({ place: null }));

    it('runs while a page holds it', () => {
        const place = () => undefined;

        expect(useRecyclerSessionStore.getState().place).toBeNull();
        useRecyclerSessionStore.getState().start(place);
        expect(useRecyclerSessionStore.getState().place).toBe(place);
        useRecyclerSessionStore.getState().stop(place);
        expect(useRecyclerSessionStore.getState().place).toBeNull();
    });

    it('is not ended by a page that no longer holds it', () => {
        const first = () => undefined;
        const second = () => undefined;

        useRecyclerSessionStore.getState().start(first);
        useRecyclerSessionStore.getState().start(second);
        useRecyclerSessionStore.getState().stop(first);

        expect(useRecyclerSessionStore.getState().place).toBe(second);
    });
});
