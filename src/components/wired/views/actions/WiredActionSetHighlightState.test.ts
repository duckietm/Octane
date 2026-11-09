/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
    normalizeWiredActionSetHighlight,
    serializeWiredActionSetHighlight,
    snapWiredHighlightStrength,
    WIRED_HIGHLIGHT_BRIGHTEN,
    WIRED_HIGHLIGHT_COLOR_TINT,
    WIRED_HIGHLIGHT_DARKEN,
    WIRED_HIGHLIGHT_OUTLINE,
    wiredHighlightAnimations,
    wiredHighlightDarkenLevels,
    wiredHighlightStrengthOptions
} from './WiredActionSetHighlightState';

describe('set furni highlight editor', () => {
    it('reads the official int params and sources', () => {
        const state = normalizeWiredActionSetHighlight([1, WIRED_HIGHLIGHT_OUTLINE, 100, 0x2146FF, 0, 3, 1], [200], [201, 0]);

        expect(state).toMatchObject({ audience: 1, highlightType: 0, strength: 100, color: 0x2146FF, animation: 0, easing: 3, targetUsers: true, furniSource: 200, userSource: 201, targetUserSource: 0 });
    });

    it('shows a saved brighten at double strength and saves half of it, always pulsing and white', () => {
        const state = normalizeWiredActionSetHighlight([0, WIRED_HIGHLIGHT_BRIGHTEN, 38, 0, 0, 2, 0]);

        expect(state.strength).toBe(76);
        expect(state.animation).toBe(1);
        expect(serializeWiredActionSetHighlight(state).intParams).toEqual([0, WIRED_HIGHLIGHT_BRIGHTEN, 38, 0xFFFFFF, 1, 2, 0]);
        expect(wiredHighlightAnimations(WIRED_HIGHLIGHT_BRIGHTEN)).toEqual([1]);
    });

    it('saves darken without a colour', () => {
        const state = normalizeWiredActionSetHighlight([0, WIRED_HIGHLIGHT_DARKEN, 40, 0xFF0000, 0, 0, 0]);

        expect(serializeWiredActionSetHighlight(state).intParams[3]).toBe(0);
    });

    it('offers the official strength steps per type', () => {
        expect(wiredHighlightStrengthOptions(WIRED_HIGHLIGHT_OUTLINE).map((option) => option.value)).toEqual([0, 100]);
        expect(wiredHighlightStrengthOptions(WIRED_HIGHLIGHT_COLOR_TINT).map((option) => option.value)).toEqual([0, 25, 50, 75, 100]);
        expect(wiredHighlightStrengthOptions(WIRED_HIGHLIGHT_COLOR_TINT).map((option) => option.level)).toEqual([0, 1, 2, 3, 4]);
        expect(wiredHighlightStrengthOptions(WIRED_HIGHLIGHT_BRIGHTEN).map((option) => option.value)).toEqual([0, 76]);
        expect(wiredHighlightStrengthOptions(WIRED_HIGHLIGHT_DARKEN, wiredHighlightDarkenLevels('0,30,60')).map((option) => option.level)).toEqual([0, 1, 2]);
    });

    it('snaps a strength to the nearest option', () => {
        expect(snapWiredHighlightStrength(WIRED_HIGHLIGHT_COLOR_TINT, 60)).toBe(50);
        expect(snapWiredHighlightStrength(WIRED_HIGHLIGHT_OUTLINE, 70)).toBe(100);
        expect(snapWiredHighlightStrength(WIRED_HIGHLIGHT_BRIGHTEN, 10)).toBe(76);
    });

    it('falls back to the default darken levels on an empty hotel setting', () => {
        expect(wiredHighlightDarkenLevels('')).toHaveLength(11);
    });
});
