/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
    normalizeWiredActionChangeOpacity,
    serializeWiredActionChangeOpacity,
    WIRED_OPACITY_DEFAULT_DURATION,
    WIRED_OPACITY_EASING_INSTANT,
    WIRED_OPACITY_MAXIMUM,
    WIRED_OPACITY_SELECTED_FURNI_SOURCE,
    WIRED_OPACITY_TRIGGER_USER_SOURCE,
    WIRED_OPACITY_VISIBILITY_SOURCE_USERS
} from './WiredActionChangeOpacityState';

describe('WiredActionChangeOpacityState', () => {
    it('opens a fresh box visible, for the selected users, instantly', () => {
        expect(normalizeWiredActionChangeOpacity()).toEqual({
            visibility: WIRED_OPACITY_VISIBILITY_SOURCE_USERS,
            opacity: WIRED_OPACITY_MAXIMUM,
            easing: WIRED_OPACITY_EASING_INSTANT,
            duration: WIRED_OPACITY_DEFAULT_DURATION,
            furniSource: WIRED_OPACITY_SELECTED_FURNI_SOURCE,
            userSource: WIRED_OPACITY_TRIGGER_USER_SOURCE,
            clickThrough: false,
            targetUsers: false,
            targetUserSource: WIRED_OPACITY_TRIGGER_USER_SOURCE
        });
    });

    it('reads the official layout: transparency 100 is invisible', () => {
        expect(normalizeWiredActionChangeOpacity([1, 100, 1, 3, 1, 7], [200], [201, 11])).toEqual({
            visibility: 1,
            opacity: 0,
            clickThrough: true,
            easing: 3,
            targetUsers: true,
            duration: 7,
            furniSource: 200,
            userSource: 201,
            targetUserSource: 11
        });
    });

    it('clamps malformed input and rejects unsupported sources', () => {
        const state = normalizeWiredActionChangeOpacity([99, -12, 7, 90, 5, 44], [999], [-8]);

        expect(state.visibility).toBe(WIRED_OPACITY_VISIBILITY_SOURCE_USERS);
        expect(state.opacity).toBe(WIRED_OPACITY_MAXIMUM);
        expect(state.clickThrough).toBe(false);
        expect(state.easing).toBe(4);
        expect(state.duration).toBe(10);
        expect(state.furniSource).toBe(WIRED_OPACITY_SELECTED_FURNI_SOURCE);
        expect(state.userSource).toBe(WIRED_OPACITY_TRIGGER_USER_SOURCE);
    });

    it('writes the official ints with our transition seconds after them, and the source slots', () => {
        expect(
            serializeWiredActionChangeOpacity({
                visibility: 1,
                opacity: 0,
                easing: 2,
                duration: Number.NaN,
                furniSource: 100,
                userSource: 0,
                clickThrough: true,
                targetUsers: false,
                targetUserSource: 0
            })
        ).toEqual({ intParams: [1, 100, 1, 2, 0, WIRED_OPACITY_DEFAULT_DURATION], furniSources: [100], userSources: [0, 0] });
    });

    it('keeps our in-between values as a transparency', () => {
        expect(serializeWiredActionChangeOpacity({ ...normalizeWiredActionChangeOpacity(), opacity: 35 }).intParams[1]).toBe(65);
    });
});
