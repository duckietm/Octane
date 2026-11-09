import { describe, expect, it } from 'vitest';
import { getCatalogScrollbarMetrics } from './catalogScrollbar.helpers';

describe('getCatalogScrollbarMetrics', () => {
    it('hides the control when all content fits', () => {
        expect(getCatalogScrollbarMetrics(80, 80, 48, 0)).toEqual({ overflow: false, thumbSize: 48, thumbOffset: 0 });
    });

    it('keeps a twelve pixel minimum thumb and maps the scroll position to the track', () => {
        expect(getCatalogScrollbarMetrics(400, 80, 48, 160)).toEqual({
            overflow: true,
            thumbSize: 12,
            thumbOffset: 18
        });
    });
});
