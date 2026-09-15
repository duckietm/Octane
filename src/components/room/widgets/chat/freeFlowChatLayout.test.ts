import { describe, expect, it } from 'vitest';
import {
    clampBubbleLeftToDesktopMargins,
    DESKTOP_MARGIN_LEFT,
    DESKTOP_MARGIN_RIGHT,
    followFreeFlowAnchor,
    getBubbleCollisionHeight,
    getBubbleMaxHeight,
    getChatFontSizeScale,
    getChatViewerHeight,
    getHighlightHint,
    resolveFreeFlowLayout,
    resolveLineByLineLayout
} from './freeFlowChatLayout';

describe('resolveFreeFlowLayout', () => {
    it('separates a shallow horizontal collision before stacking bubbles vertically', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 230, top: 100, width: 240, height: 26, anchorX: 350 }
        ]);

        expect(result).toEqual([
            { id: 1, left: -5, top: 100, pointerX: 125 },
            { id: 2, left: 236, top: 100, pointerX: 114 }
        ]);
    });

    it('keeps the pointer inside the bubble margins when collision movement shifts the bubble away from its avatar', () => {
        const [result] = resolveFreeFlowLayout([{ id: 1, left: 100, top: 100, width: 120, height: 26, anchorX: 90 }]);

        expect(result.pointerX).toBe(28);
    });

    it('clears the older bubble completely when horizontal separation is too large', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 0, top: 100, width: 240, height: 26, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 73 },
            { id: 2, top: 100 }
        ]);
    });

    it('keeps the artwork painted outside the bubble box clear of the bubble below it', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 },
            { id: 2, left: 0, top: 136, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 98 },
            { id: 2, top: 136 }
        ]);
    });

    it('leaves bubbles alone once the painted artwork no longer overlaps', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 },
            { id: 2, left: 0, top: 138, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 100 },
            { id: 2, top: 138 }
        ]);
    });

    it('keeps a taller new message below the shorter older one it spawns behind', () => {

        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 180, width: 240, height: 20, anchorX: 120 },
            { id: 2, left: 0, top: 160, width: 240, height: 40, anchorX: 120 }
        ]);
        const byId = new Map(result.map((bubble) => [bubble.id, bubble]));

        expect(byId.get(2).top).toBe(160);
        expect(byId.get(1).top + 20).toBeLessThanOrEqual(byId.get(2).top);
    });

    it('stacks a burst of bubbles from a single speaker without any of them overlapping', () => {
        const bubbles = Array.from({ length: 8 }, (unused, index) => ({
            id: index + 1,
            left: 0,
            top: 200,
            width: 240,
            height: 30,
            anchorX: 120,
            overflowTop: 2,
            overflowBottom: 5
        }));

        const result = resolveFreeFlowLayout(bubbles).sort((first, second) => first.top - second.top);

        result.forEach((bubble, index) => {
            if (!index) return;

            expect(bubble.top).toBeGreaterThanOrEqual(result[index - 1].top + 30 + 5 + 2);
        });

        // Top to bottom must read oldest to newest.
        expect(result.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
});

describe('getChatViewerHeight', () => {
    it('uses one quarter of the viewport when no valid override is configured', () => {
        expect(getChatViewerHeight(800)).toBe(200);
        expect(getChatViewerHeight(800, Number.NaN)).toBe(200);
    });

    it('preserves an explicit room-chat height override', () => {
        expect(getChatViewerHeight(800, 0.4)).toBe(320);
    });
});

describe('followFreeFlowAnchor', () => {
    it('moves a bubble by the avatar delta without discarding its collision offset', () => {
        expect(followFreeFlowAnchor(80, 100, 125)).toBe(105);
    });
});

describe('official bubble rules', () => {
    it('keeps a desktop bubble clear of the left toolbar and the right panels', () => {
        expect(clampBubbleLeftToDesktopMargins(10, 200, 1280)).toBe(DESKTOP_MARGIN_LEFT);
        expect(clampBubbleLeftToDesktopMargins(1200, 200, 1280)).toBe(1280 - DESKTOP_MARGIN_RIGHT - 200);
        expect(clampBubbleLeftToDesktopMargins(400, 200, 1280)).toBe(400);
    });

    it('lets the left margin win when the stage is too narrow for both margins', () => {
        expect(clampBubbleLeftToDesktopMargins(300, 500, 700)).toBe(DESKTOP_MARGIN_LEFT);
    });

    it('does not clamp on the phone layout', () => {
        expect(clampBubbleLeftToDesktopMargins(10, 200, 375)).toBe(10);
    });

    it('limits the collision height to 108 px scaled by the chat font size', () => {
        expect(getChatFontSizeScale(14)).toBe(1);
        expect(getChatFontSizeScale(12)).toBe(1);
        expect(getChatFontSizeScale(21)).toBe(1.5);
        expect(getBubbleMaxHeight(1)).toBe(108);
        expect(getBubbleMaxHeight(1.5)).toBe(162);
        expect(getBubbleCollisionHeight(300, 1)).toBe(108);
        expect(getBubbleCollisionHeight(40, 1)).toBe(40);
    });

    it('turns a highlight link into an upper-case hint and leaves other links alone', () => {
        expect(getHighlightHint('highlight/wired%20trigger')).toBe('WIRED TRIGGER');
        expect(getHighlightHint('event:highlight/furni')).toBe('FURNI');
        expect(getHighlightHint('https://example.com')).toBeNull();
        expect(getHighlightHint('')).toBeNull();
    });

    it('stacks every line on its own row in line-by-line mode, newest at the bottom', () => {
        const result = resolveLineByLineLayout([
            { id: 1, left: 0, top: 100, width: 100, height: 26, anchorX: 50 },
            { id: 2, left: 300, top: 100, width: 100, height: 26, anchorX: 350 },
            { id: 3, left: 600, top: 100, width: 100, height: 30, anchorX: 650 }
        ]);

        expect(result.map(({ id, left, top }) => ({ id, left, top }))).toEqual([
            { id: 1, left: 0, top: 46 },
            { id: 2, left: 300, top: 73 },
            { id: 3, left: 600, top: 100 }
        ]);
    });

    it('leaves an older line that already sits high enough where it is', () => {
        const result = resolveLineByLineLayout([
            { id: 1, left: 0, top: 10, width: 100, height: 26, anchorX: 50 },
            { id: 2, left: 0, top: 100, width: 100, height: 26, anchorX: 50 }
        ]);

        expect(result[0].top).toBe(10);
    });
});
