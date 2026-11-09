/* @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { screenToTile, tileToScreen, usePointerToTile } from './usePointerToTile';

describe('tileToScreen / screenToTile round-trip', () => {
    it('origin tile (0,0) projects to (1024, 0) and back', () => {
        const [sx, sy] = tileToScreen(0, 0);
        expect(sx).toBe(1024);
        expect(sy).toBe(0);
        expect(screenToTile(sx, sy)).toEqual([0, 0]);
    });

    it('tile (3, 5) round-trips', () => {
        const [sx, sy] = tileToScreen(3, 5);
        const [r, c] = screenToTile(sx, sy);
        expect(r).toBeCloseTo(3, 5);
        expect(c).toBeCloseTo(5, 5);
    });

    it('rounds to the containing diamond for jittered points', () => {
        const [sx, sy] = tileToScreen(7, 2);
        const [r, c] = screenToTile(sx + 2, sy + 1);
        expect(Math.round(r)).toBe(7);
        expect(Math.round(c)).toBe(2);
    });
});

describe('usePointerToTile', () => {
    it('returns null when no SVG ref is attached', () => {
        const ref = { current: null } as React.RefObject<SVGSVGElement | null>;
        const { result } = renderHook(() => usePointerToTile(ref, { width: 2048, height: 1024 }));
        expect(result.current.fromClient(100, 100)).toBeNull();
    });
});
