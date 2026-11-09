/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { FURNI_SOURCES, getAvailableUserSources, getServerSlotSources, USER_SOURCES } from './WiredSourcesSelector';

const trigger = (furniAllowed: number[][], userAllowed: number[][]) =>
    ({ inputSourcesConf: { furniAllowed, userAllowed, furniDefaults: [], userDefaults: [] } }) as never;

describe('server input sources per slot', () => {
    it('keeps the view list when the server sends no list for the slot', () => {
        expect(getServerSlotSources(null, 'furni', 0, FURNI_SOURCES)).toBe(FURNI_SOURCES);
        expect(getServerSlotSources(trigger([], []), 'users', 0, USER_SOURCES)).toBe(USER_SOURCES);
        expect(getServerSlotSources(trigger([[100, 200]], []), 'furni', 1, FURNI_SOURCES)).toBe(FURNI_SOURCES);
    });

    it('uses the server list of the slot, in its order, keeping the view labels', () => {
        const custom = [{ value: 100, label: 'custom.picked' }];
        const sources = getServerSlotSources(trigger([[200, 100, 101]], []), 'furni', 0, custom);

        expect(sources).toEqual([
            { value: 200, label: 'wiredfurni.params.sources.furni.200' },
            { value: 100, label: 'custom.picked' },
            { value: 101, label: 'wiredfurni.params.sources.furni.101' }
        ]);
    });

    it('reads the requested user slot and leaves the clicked user source to the stack check', () => {
        const sources = getServerSlotSources(trigger([], [[0, 200, 201], [0, 11, 101]]), 'users', 1, USER_SOURCES);

        expect(sources.map((source) => source.value)).toEqual([0, 101]);
        expect(sources[1].label).toBe('wiredfurni.params.sources.users.101');
    });
});

describe('stack-dependent user sources', () => {
    const values = (sources: { value: number }[]) => sources.map((source) => source.value);

    it('puts the reached user (10) and the clicked user (11) right after the triggering user', () => {
        expect(values(getAvailableUserSources(null, USER_SOURCES, 0, undefined, true, { clickedUser: false, reachedUser: true }))).toEqual([0, 10, 200, 201]);
        expect(values(getAvailableUserSources(null, USER_SOURCES, 0, undefined, true, { clickedUser: true, reachedUser: false }))).toEqual([0, 11, 200, 201]);
        expect(values(getAvailableUserSources(null, USER_SOURCES, 0, undefined, true, { clickedUser: false, reachedUser: false }))).toEqual([0, 200, 201]);
    });

    it('never adds them to a bot row or a row that opts out', () => {
        const both = { clickedUser: true, reachedUser: true };

        expect(values(getAvailableUserSources(null, USER_SOURCES, 0, 'wiredfurni.params.sources.users.title.bots', true, both))).toEqual([0, 200, 201]);
        expect(values(getAvailableUserSources(null, USER_SOURCES, 0, undefined, false, both))).toEqual([0, 200, 201]);
    });
});
