import { FURNI_SOURCES, USER_SOURCES } from '../WiredSourcesSelector';

export const WIRED_OPACITY_VISIBILITY_SOURCE_USERS = 0;
export const WIRED_OPACITY_VISIBILITY_EVERYONE = 1;
export const WIRED_OPACITY_EASING_INSTANT = 0;
export const WIRED_OPACITY_MINIMUM = 0;
export const WIRED_OPACITY_MAXIMUM = 100;
export const WIRED_OPACITY_MINIMUM_DURATION = 1;
export const WIRED_OPACITY_MAXIMUM_DURATION = 10;
// 0 = server default transition (400 ms); explicit 1-10 s still supported.
export const WIRED_OPACITY_DEFAULT_DURATION = 0;
export const WIRED_OPACITY_SELECTED_FURNI_SOURCE = 100;
export const WIRED_OPACITY_TRIGGER_USER_SOURCE = 0;

/**
 * The editor's state. `opacity` is ours (100 = fully visible); the official box only knows visible
 * (transparency 0) and invisible (transparency 100).
 */
export interface WiredActionChangeOpacityState {
    visibility: number;
    opacity: number;
    easing: number;
    duration: number;
    furniSource: number;
    userSource: number;
    clickThrough: boolean;
    targetUsers: boolean;
    targetUserSource: number;
}

const clampInteger = (value: number, minimum: number, maximum: number) => {
    const normalized = Number.isFinite(value) ? Math.round(value) : minimum;

    return Math.min(maximum, Math.max(minimum, normalized));
};

const hasSource = (options: { value: number }[], value: number) => options.some((option) => option.value === value);

const normalizeDuration = (value: number) => {
    const normalized = Number.isFinite(value) ? Math.round(value) : WIRED_OPACITY_DEFAULT_DURATION;

    if (normalized <= WIRED_OPACITY_DEFAULT_DURATION) return WIRED_OPACITY_DEFAULT_DURATION;

    return Math.min(WIRED_OPACITY_MAXIMUM_DURATION, Math.max(WIRED_OPACITY_MINIMUM_DURATION, normalized));
};

/**
 * Official layout: int params `[audience (1 everyone), visibility (0 visible, 100 invisible), click
 * through, easing, target users]`, ours follows: `transition seconds`. Furni slot 0 the target furni,
 * user slot 0 the audience, slot 1 the target users.
 */
export const normalizeWiredActionChangeOpacity = (
    intData: readonly number[] = [],
    furniSources: readonly number[] = [],
    userSources: readonly number[] = []
): WiredActionChangeOpacityState => ({
    visibility: intData[0] === WIRED_OPACITY_VISIBILITY_EVERYONE ? WIRED_OPACITY_VISIBILITY_EVERYONE : WIRED_OPACITY_VISIBILITY_SOURCE_USERS,
    opacity: WIRED_OPACITY_MAXIMUM - clampInteger(intData[1] ?? 0, WIRED_OPACITY_MINIMUM, WIRED_OPACITY_MAXIMUM),
    clickThrough: intData[2] === 1,
    easing: clampInteger(intData[3] ?? WIRED_OPACITY_EASING_INSTANT, 0, 4),
    targetUsers: intData[4] === 1,
    duration: normalizeDuration(intData[5] ?? WIRED_OPACITY_DEFAULT_DURATION),
    furniSource: hasSource(FURNI_SOURCES, furniSources[0]) ? furniSources[0] : WIRED_OPACITY_SELECTED_FURNI_SOURCE,
    userSource: hasSource(USER_SOURCES, userSources[0]) ? userSources[0] : WIRED_OPACITY_TRIGGER_USER_SOURCE,
    targetUserSource: Number.isInteger(userSources[1]) ? userSources[1] : WIRED_OPACITY_TRIGGER_USER_SOURCE
});

export const serializeWiredActionChangeOpacity = (state: WiredActionChangeOpacityState) => {
    const opacity = clampInteger(state.opacity, WIRED_OPACITY_MINIMUM, WIRED_OPACITY_MAXIMUM);
    const normalized = normalizeWiredActionChangeOpacity(
        [
            state.visibility,
            WIRED_OPACITY_MAXIMUM - opacity,
            state.clickThrough ? 1 : 0,
            state.easing,
            state.targetUsers ? 1 : 0,
            state.duration
        ],
        [state.furniSource],
        [state.userSource, state.targetUserSource]
    );

    return {
        intParams: [
            normalized.visibility,
            WIRED_OPACITY_MAXIMUM - normalized.opacity,
            normalized.clickThrough ? 1 : 0,
            normalized.easing,
            normalized.targetUsers ? 1 : 0,
            normalized.duration
        ],
        furniSources: [normalized.furniSource],
        userSources: [normalized.userSource, normalized.targetUserSource]
    };
};
