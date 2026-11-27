/* @vitest-environment jsdom */

import { GetConfiguration } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandheldStore } from '../../state/handheldStore';
import { DESKTOP_LAYOUT } from './handheldLayout';
import { HANDHELD_FORCE_STORAGE_KEY, HANDHELD_ROOT_ATTRIBUTE, startHandheldWatcher } from './handheldWatcher';

const setViewport = (width: number, height: number) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
};

const setQuery = (query: string) => window.history.replaceState(null, '', `/${query}`);

let stop: () => void = () => {};

beforeEach(() => {
    window.localStorage.clear();
    useHandheldStore.setState({ layout: DESKTOP_LAYOUT, keyboardInset: 0 });
});

afterEach(() => {
    stop();
    setQuery('');
    vi.restoreAllMocks();
    document.documentElement.removeAttribute(HANDHELD_ROOT_ATTRIBUTE);
});

describe('startHandheldWatcher', () => {
    it('leaves the desktop exactly as it was: no attribute, desktop layout in the store', () => {
        setViewport(1280, 800);
        stop = startHandheldWatcher();

        expect(document.documentElement.hasAttribute(HANDHELD_ROOT_ATTRIBUTE)).toBe(false);
        expect(useHandheldStore.getState().layout.active).toBe(false);
    });

    it('switches on with ?handheld=on, remembers it, and follows rotation', () => {
        setViewport(390, 844);
        setQuery('?handheld=on');
        stop = startHandheldWatcher();

        expect(document.documentElement.getAttribute(HANDHELD_ROOT_ATTRIBUTE)).toBe('portrait');
        expect(useHandheldStore.getState().layout).toEqual({ active: true, orientation: 'portrait' });
        expect(window.localStorage.getItem(HANDHELD_FORCE_STORAGE_KEY)).toBe('on');

        setViewport(844, 390);
        window.dispatchEvent(new Event('resize'));

        expect(document.documentElement.getAttribute(HANDHELD_ROOT_ATTRIBUTE)).toBe('landscape');
    });

    it('?handheld=auto forgets a remembered choice', () => {
        window.localStorage.setItem(HANDHELD_FORCE_STORAGE_KEY, 'on');
        setViewport(1280, 800);
        setQuery('?handheld=auto');
        stop = startHandheldWatcher();

        expect(window.localStorage.getItem(HANDHELD_FORCE_STORAGE_KEY)).toBeNull();
        expect(document.documentElement.hasAttribute(HANDHELD_ROOT_ATTRIBUTE)).toBe(false);
    });

    it('stays off when the hotel turned ui.handheld.enabled off', () => {
        vi.mocked(GetConfiguration).mockReturnValueOnce({ getValue: () => false } as never);
        setViewport(390, 844);
        setQuery('?handheld=on');
        stop = startHandheldWatcher();

        expect(document.documentElement.hasAttribute(HANDHELD_ROOT_ATTRIBUTE)).toBe(false);
        expect(useHandheldStore.getState().layout.active).toBe(false);
    });
});
