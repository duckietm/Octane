import { describe, expect, it } from 'vitest';
import { WiredAddonLayoutCode } from './WiredAddonLayoutCode';
import {
    defaultWiredVariableFxParams,
    IWiredVariableFxConfigLike,
    sanitizeWiredVariableFxAppearance,
    WIRED_FX_COLOR,
    WIRED_FX_WIDTH,
    wiredVariableFxAppearance,
    wiredVariableFxColorLabel,
    readWiredVariableFxParams,
    readWiredVariableFxTokens,
    resolveWiredVariableFxRenderer,
    WIRED_FX_CATEGORY,
    WIRED_FX_RENDERER,
    WIRED_FX_SHOW_MODE,
    WIRED_FX_STATUS_BAR_THEMES,
    WIRED_FX_UPDATE,
    wiredVariableFxCategoryOfCode,
    wiredVariableFxRendererOptions,
    wiredVariableFxSegmentRenderer,
    wiredVariableFxStackOrder,
    wiredVariableFxStyles,
    wiredVariableFxUpdateKind,
    wiredVariableFxVisibleUntil,
    writeWiredVariableFxParams,
    writeWiredVariableFxTokens
} from './WiredVariableFx';

const config = (overrides: Partial<IWiredVariableFxConfigLike> = {}): IWiredVariableFxConfigLike => ({
    category: WIRED_FX_CATEGORY.PROGRESS_BAR,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: WIRED_FX_RENDERER.PLAIN,
    showMode: WIRED_FX_SHOW_MODE.ALWAYS,
    showDurationMs: 3000,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {} as Record<string, string>,
    ...overrides
});

describe('WiredVariableFx helpers', () => {
    it('maps the six layout codes to their categories and nothing else', () => {
        expect(wiredVariableFxCategoryOfCode(WiredAddonLayoutCode.VARIABLE_FX_HEALTH_POINTS)).toBe(WIRED_FX_CATEGORY.HEALTH_POINTS);
        expect(wiredVariableFxCategoryOfCode(WiredAddonLayoutCode.VARIABLE_FX_NUMBER_DISPLAY)).toBe(WIRED_FX_CATEGORY.NUMBER_DISPLAY);
        expect(wiredVariableFxCategoryOfCode(WiredAddonLayoutCode.VARIABLE_LEADERBOARD)).toBe(-1);
    });

    it('mirrors the server style tables', () => {
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.HEALTH_POINTS)).toHaveLength(4);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.PROGRESS_BAR)).toHaveLength(5);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.LEVELLING_PROGRESS)).toHaveLength(2);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.STATUS_BAR)).toHaveLength(WIRED_FX_STATUS_BAR_THEMES.length);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.BOSS_BAR)).toHaveLength(2);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.NUMBER_DISPLAY)).toHaveLength(3);
        expect(wiredVariableFxStyles(99)).toBe(wiredVariableFxStyles(WIRED_FX_CATEGORY.PROGRESS_BAR));
    });

    it('round-trips the official params and clamps what the server would clamp', () => {
        const params = { ...defaultWiredVariableFxParams(), visibility: 1, showMode: 1, showDurationMs: 2500, styleId: 3, segments: 6, overrideMaxEnabled: true, overrideMaxTarget: 1, audienceValue: 7 };

        expect(readWiredVariableFxParams(writeWiredVariableFxParams(params), WIRED_FX_CATEGORY.PROGRESS_BAR)).toEqual(params);

        const clamped = readWiredVariableFxParams([9, 99, 99, 0, 0, 1, 99, 5, 2, 0, 0, 0, 0, 100, 1, 1, 9, 9, 0, 0, 999, 0, 0], WIRED_FX_CATEGORY.PROGRESS_BAR);

        expect(clamped.source).toBe(0);
        expect(clamped.visibility).toBe(4);
        expect(clamped.showMode).toBe(2);
        expect(clamped.showDurationMs).toBe(1500);
        expect(clamped.styleId).toBe(4);
        expect(clamped.segments).toBe(100);
        expect(clamped.overrideMinTarget).toBe(0);
        expect(readWiredVariableFxParams(writeWiredVariableFxParams({ ...params, defaultMin: -5, source: 1 }), WIRED_FX_CATEGORY.PROGRESS_BAR).defaultMin).toBe(-5);
        expect(writeWiredVariableFxParams({ ...params, overrideMaxTarget: 1 })[17]).toBe(-10);
        expect(readWiredVariableFxParams([], WIRED_FX_CATEGORY.BOSS_BAR)).toEqual(defaultWiredVariableFxParams());
    });

    it('round-trips the string tokens and strips stray tabs', () => {
        const tokens = { overrideMinToken: 'custom:300', overrideMaxToken: '', audienceToken: 'custom:400', icon: 'misc_heart' };

        expect(writeWiredVariableFxTokens(tokens)).toBe('custom:300\t\tcustom:400\tmisc_heart');
        expect(readWiredVariableFxTokens('custom:300\t\tcustom:400\tmisc_heart')).toEqual(tokens);
        expect(readWiredVariableFxTokens('')).toEqual({ overrideMinToken: '', overrideMaxToken: '', audienceToken: '', icon: '' });
        expect(writeWiredVariableFxTokens({ ...tokens, icon: 'a\tb' })).toBe('custom:300\t\tcustom:400\tab');
    });

    it('lets a level badge pass the segment count to the bar it draws', () => {
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 0, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.ARROW);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 0, 77)).toBe(WIRED_FX_RENDERER.BLOCK);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 1, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.CLASSIC_MINI);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.PROGRESS_BAR, 1, 0)).toBe(WIRED_FX_RENDERER.BLOCK);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.STATUS_BAR, 0, 0, WIRED_FX_RENDERER.STRIPED)).toBe(WIRED_FX_RENDERER.STRIPED);
    });

    it("draws health points with AIR's renderers and lets status bars pick one of three bars", () => {
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.HEALTH_POINTS).map((style) => style.rendererId)).toEqual([
            WIRED_FX_RENDERER.HEALTH_BAR,
            WIRED_FX_RENDERER.STACKED_HEARTS,
            WIRED_FX_RENDERER.THERMOMETER,
            WIRED_FX_RENDERER.SINGLE_HEART
        ]);
        expect(wiredVariableFxRendererOptions(WIRED_FX_CATEGORY.STATUS_BAR, 3)).toEqual([WIRED_FX_RENDERER.BLOCK, WIRED_FX_RENDERER.STRIPED, WIRED_FX_RENDERER.ARROW]);
        expect(resolveWiredVariableFxRenderer(WIRED_FX_CATEGORY.STATUS_BAR, 3, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.ARROW);
        expect(resolveWiredVariableFxRenderer(WIRED_FX_CATEGORY.STATUS_BAR, 3, 0)).toBe(WIRED_FX_RENDERER.BLOCK);
        expect(resolveWiredVariableFxRenderer(WIRED_FX_CATEGORY.PROGRESS_BAR, 2, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.STRIPED);
    });

    it('sorts updates by kind and reads the stack order from the config extra', () => {
        expect(wiredVariableFxUpdateKind(null, 5)).toBe(WIRED_FX_UPDATE.CREATED);
        expect(wiredVariableFxUpdateKind(4, 5)).toBe(WIRED_FX_UPDATE.INCREASED);
        expect(wiredVariableFxUpdateKind(6, 5)).toBe(WIRED_FX_UPDATE.DECREASED);
        expect(wiredVariableFxUpdateKind(5, 5)).toBe(WIRED_FX_UPDATE.UNCHANGED);
        expect(wiredVariableFxStackOrder(config({ extra: { stack_order: '-4' } }))).toBe(-4);
        expect(wiredVariableFxStackOrder(config())).toBe(0);
    });

    it("offers AIR's colours and widths per style and falls back to the style's defaults", () => {
        const plain = wiredVariableFxAppearance(WIRED_FX_CATEGORY.PROGRESS_BAR, 0);

        expect(plain.colors).toHaveLength(25);
        expect(plain.colors).toContain(WIRED_FX_COLOR.EMERALD);
        expect(plain.colors).toContain(WIRED_FX_COLOR.DYNAMIC_TEAM);
        expect(plain.defaultColor).toBe(WIRED_FX_COLOR.GREEN);
        expect(plain.widths).toEqual([WIRED_FX_WIDTH.EXTRA_SMALL, WIRED_FX_WIDTH.SMALL, WIRED_FX_WIDTH.MEDIUM, WIRED_FX_WIDTH.LARGE, WIRED_FX_WIDTH.EXTRA_LARGE]);
        expect(wiredVariableFxAppearance(WIRED_FX_CATEGORY.HEALTH_POINTS, 0).colors).toEqual([WIRED_FX_COLOR.DYNAMIC_RED_TO_GREEN]);
        expect(wiredVariableFxAppearance(WIRED_FX_CATEGORY.BOSS_BAR, 0)).toMatchObject({ colors: [WIRED_FX_COLOR.RED], widths: [WIRED_FX_WIDTH.LARGE, WIRED_FX_WIDTH.EXTRA_LARGE, WIRED_FX_WIDTH.HUGE], defaultWidth: WIRED_FX_WIDTH.EXTRA_LARGE });
        expect(wiredVariableFxAppearance(WIRED_FX_CATEGORY.STATUS_BAR, 16).defaultColor).toBe(WIRED_FX_COLOR.DYNAMIC_RED_TO_GREEN);
        expect(wiredVariableFxAppearance(WIRED_FX_CATEGORY.STATUS_BAR, 0).colors).toEqual([-1]);
        expect(sanitizeWiredVariableFxAppearance(WIRED_FX_CATEGORY.PROGRESS_BAR, 0, -1, 2)).toEqual({ colorId: WIRED_FX_COLOR.GREEN, widthId: 2 });
        expect(sanitizeWiredVariableFxAppearance(WIRED_FX_CATEGORY.NUMBER_DISPLAY, 0, WIRED_FX_COLOR.BLUE, 2)).toEqual({ colorId: WIRED_FX_COLOR.BLUE, widthId: -1 });
        expect(wiredVariableFxColorLabel(102, (key, fallback) => (key.endsWith('metallic') ? '[Metal]' : key.endsWith('102') ? 'Gold' : fallback))).toBe('[Metal] Gold');
        expect(wiredVariableFxColorLabel(1000, (key, fallback) => (key.endsWith('dynamic') ? '[Dyn]' : 'Red to green'))).toBe('[Dyn] Red to green');
    });

    it('shows a value always, on hover, or for the show duration after a picked update', () => {
        expect(wiredVariableFxVisibleUntil(config(), null, false, 999999)).toEqual({ visible: true, until: null });
        expect(wiredVariableFxVisibleUntil(config({ showMode: WIRED_FX_SHOW_MODE.NEVER }), null, false, 0)).toEqual({ visible: false, until: null });
        expect(wiredVariableFxVisibleUntil(config({ showMode: WIRED_FX_SHOW_MODE.NEVER, showOnMouseHover: true }), null, true, 0)).toEqual({ visible: true, until: null });

        const changing = config({ showMode: WIRED_FX_SHOW_MODE.WHEN_CHANGES, showDurationMs: 2000 });

        expect(wiredVariableFxVisibleUntil(changing, null, true, 0)).toEqual({ visible: false, until: null });
        expect(wiredVariableFxVisibleUntil(changing, 1000, false, 2500)).toEqual({ visible: true, until: 3000 });
        expect(wiredVariableFxVisibleUntil(changing, 1000, false, 3000)).toEqual({ visible: false, until: 3000 });
        expect(wiredVariableFxVisibleUntil({ ...changing, showOnMouseHover: true }, 1000, true, 9000)).toEqual({ visible: true, until: null });
    });
});
