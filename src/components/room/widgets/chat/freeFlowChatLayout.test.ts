import { describe, expect, it } from 'vitest';
import { followFreeFlowAnchor, getChatViewerHeight, resolveFreeFlowLayout } from './freeFlowChatLayout';

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

    it('separates the full visible height when two bubbles start at the same position', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 0, top: 100, width: 240, height: 26, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 73 },
            { id: 2, top: 100 }
        ]);
    });

    it('removes visible overlap when the DOM measurement excludes the absolute pointer', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120 },
            { id: 2, left: 0, top: 120, width: 240, height: 30, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 89 },
            { id: 2, top: 120 }
        ]);
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
