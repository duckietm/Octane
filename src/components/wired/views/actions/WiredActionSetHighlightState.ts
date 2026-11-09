import { FURNI_SOURCES, USER_SOURCES } from '../WiredSourcesSelector';

export const WIRED_HIGHLIGHT_AUDIENCE_SOURCE_USERS = 0;
export const WIRED_HIGHLIGHT_AUDIENCE_EVERYONE = 1;

export const WIRED_HIGHLIGHT_OUTLINE = 0;
export const WIRED_HIGHLIGHT_SOFT_GLOW = 1;
export const WIRED_HIGHLIGHT_DARKEN = 2;
export const WIRED_HIGHLIGHT_COLOR_TINT = 3;
export const WIRED_HIGHLIGHT_BRIGHTEN = 4;
export const WIRED_HIGHLIGHT_NEON_AURA = 5;
export const WIRED_HIGHLIGHT_TYPES = [0, 1, 2, 3, 4, 5];

export const WIRED_HIGHLIGHT_ANIMATION_STEADY = 0;
export const WIRED_HIGHLIGHT_ANIMATION_PULSE = 1;

/** The brighten editor offers off and on (76) and saves half of it; the server sends the full value back out. */
export const WIRED_HIGHLIGHT_BRIGHTEN_ON = 76;

/** The official palette; colour tint leaves out the first entry (white). */
export const WIRED_HIGHLIGHT_COLORS = [
    16777215, 16772910, 16758528, 16747008, 16734774, 16724016, 16724855, 16733627, 15741144, 12076287, 7883007, 4611327, 2395391,
    2146303, 2156016, 1628592, 2149480, 5300272, 10546464, 16557530, 12291417
];

export const WIRED_HIGHLIGHT_SELECTED_FURNI_SOURCE = 100;
export const WIRED_HIGHLIGHT_TRIGGER_USER_SOURCE = 0;

/** The darken levels when the hotel does not configure `wired.furni_highlight.darken_levels`. */
const DEFAULT_DARKEN_LEVELS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export interface WiredHighlightStrengthOption {
    value: number;
    /** 0 off, -1 on, otherwise the level shown as "Level n". */
    level: number;
}

export interface WiredActionSetHighlightState {
    audience: number;
    highlightType: number;
    /** The strength the editor shows: for brighten 0 or 76, whatever was saved. */
    strength: number;
    color: number;
    animation: number;
    easing: number;
    targetUsers: boolean;
    furniSource: number;
    userSource: number;
    targetUserSource: number;
}

const clampInteger = (value: number, minimum: number, maximum: number) => {
    const normalized = Number.isFinite(value) ? Math.round(value) : minimum;

    return Math.min(maximum, Math.max(minimum, normalized));
};

const hasSource = (options: { value: number }[], value: number) => options.some((option) => option.value === value);

/** The darken levels, from the hotel's comma list when it has one. */
export const wiredHighlightDarkenLevels = (configured?: string) => {
    const levels = (configured || '')
        .split(',')
        .map((value) => parseInt(value, 10))
        .filter((value) => Number.isFinite(value));

    return levels.length ? levels : DEFAULT_DARKEN_LEVELS;
};

/** The strength options of a highlight type, as the official editor builds them. */
export const wiredHighlightStrengthOptions = (highlightType: number, darkenLevels = DEFAULT_DARKEN_LEVELS): WiredHighlightStrengthOption[] => {
    if (highlightType === WIRED_HIGHLIGHT_DARKEN) return darkenLevels.map((value, index) => ({ value, level: value === 0 ? 0 : index }));

    if (highlightType === WIRED_HIGHLIGHT_BRIGHTEN) return [{ value: 0, level: 0 }, { value: WIRED_HIGHLIGHT_BRIGHTEN_ON, level: -1 }];

    // Colour tint has four levels; the others are on or off.
    const step = highlightType === WIRED_HIGHLIGHT_COLOR_TINT ? 25 : 100;
    const options: WiredHighlightStrengthOption[] = [];

    for (let value = 0; value <= 100; value += step) options.push({ value, level: value === 0 ? 0 : step === 100 ? -1 : value / step });

    return options;
};

/** The option closest to `strength` (the editor snaps a saved strength to its list). */
export const snapWiredHighlightStrength = (highlightType: number, strength: number, darkenLevels = DEFAULT_DARKEN_LEVELS) => {
    if (highlightType === WIRED_HIGHLIGHT_BRIGHTEN) return strength > 0 ? WIRED_HIGHLIGHT_BRIGHTEN_ON : 0;

    const options = wiredHighlightStrengthOptions(highlightType, darkenLevels);
    let closest = options[0].value;

    for (const option of options) if (Math.abs(option.value - strength) < Math.abs(closest - strength)) closest = option.value;

    return closest;
};

/** Brighten always pulses; the other types offer steady and pulse. */
export const wiredHighlightAnimations = (highlightType: number) =>
    highlightType === WIRED_HIGHLIGHT_BRIGHTEN ? [WIRED_HIGHLIGHT_ANIMATION_PULSE] : [WIRED_HIGHLIGHT_ANIMATION_STEADY, WIRED_HIGHLIGHT_ANIMATION_PULSE];

/** Darken and brighten have no colour. */
export const wiredHighlightHasColor = (highlightType: number) => highlightType !== WIRED_HIGHLIGHT_DARKEN && highlightType !== WIRED_HIGHLIGHT_BRIGHTEN;

/**
 * Official layout: int params `[audience (1 everyone), type, strength (half for brighten), colour, animation, easing,
 * target users]`. Furni slot 0 the target furni, user slot 0 the audience, slot 1 the target users.
 */
export const normalizeWiredActionSetHighlight = (
    intData: readonly number[] = [],
    furniSources: readonly number[] = [],
    userSources: readonly number[] = [],
    darkenLevels = DEFAULT_DARKEN_LEVELS
): WiredActionSetHighlightState => {
    const highlightType = clampInteger(intData[1] ?? WIRED_HIGHLIGHT_OUTLINE, 0, 5);
    const savedStrength = clampInteger(intData[2] ?? 100, 0, 100);
    const strength = highlightType === WIRED_HIGHLIGHT_BRIGHTEN ? savedStrength * 2 : savedStrength;
    const animation = highlightType === WIRED_HIGHLIGHT_BRIGHTEN ? WIRED_HIGHLIGHT_ANIMATION_PULSE : clampInteger(intData[4] ?? 0, 0, 1);

    return {
        audience: intData[0] === WIRED_HIGHLIGHT_AUDIENCE_EVERYONE ? WIRED_HIGHLIGHT_AUDIENCE_EVERYONE : WIRED_HIGHLIGHT_AUDIENCE_SOURCE_USERS,
        highlightType,
        strength: snapWiredHighlightStrength(highlightType, strength, darkenLevels),
        color: (intData[3] ?? 0xFFFFFF) & 0xFFFFFF,
        animation,
        easing: clampInteger(intData[5] ?? 0, 0, 4),
        targetUsers: intData[6] === 1,
        furniSource: hasSource(FURNI_SOURCES, furniSources[0]) ? furniSources[0] : WIRED_HIGHLIGHT_SELECTED_FURNI_SOURCE,
        userSource: hasSource(USER_SOURCES, userSources[0]) ? userSources[0] : WIRED_HIGHLIGHT_TRIGGER_USER_SOURCE,
        targetUserSource: Number.isInteger(userSources[1]) ? userSources[1] : WIRED_HIGHLIGHT_TRIGGER_USER_SOURCE
    };
};

export const serializeWiredActionSetHighlight = (state: WiredActionSetHighlightState) => {
    const type = state.highlightType;
    const strength = type === WIRED_HIGHLIGHT_BRIGHTEN ? Math.floor(state.strength / 2) : state.strength;
    const color = type === WIRED_HIGHLIGHT_DARKEN ? 0 : type === WIRED_HIGHLIGHT_BRIGHTEN ? 0xFFFFFF : state.color & 0xFFFFFF;
    const animation = type === WIRED_HIGHLIGHT_BRIGHTEN ? WIRED_HIGHLIGHT_ANIMATION_PULSE : state.animation;

    return {
        intParams: [
            state.audience === WIRED_HIGHLIGHT_AUDIENCE_EVERYONE ? 1 : 0,
            type,
            strength,
            color,
            animation,
            state.easing,
            state.targetUsers ? 1 : 0
        ],
        furniSources: [state.furniSource],
        userSources: [state.userSource, state.targetUserSource]
    };
};
