import { describe, expect, it } from 'vitest';
import { getClassicScrollbarMetrics } from './classicScrollbar.helpers';

describe('getClassicScrollbarMetrics', () => {
    it('hides the control when all content fits', () => {
        expect(getClassicScrollbarMetrics(80, 80, 48, 0)).toEqual({ overflow: false, thumbSize: 48, thumbOffset: 0 });
    });

    it('keeps a twelve pixel minimum thumb and maps the scroll position to the track', () => {
        expect(getClassicScrollbarMetrics(400, 80, 48, 160)).toEqual({
            overflow: true,
            thumbSize: 12,
            thumbOffset: 18
        });
    });

    it('clamps stale scroll positions after content shrinks', () => {
        expect(getClassicScrollbarMetrics(200, 100, 68, 500)).toEqual({
            overflow: true,
            thumbSize: 34,
            thumbOffset: 34
        });
    });
});
