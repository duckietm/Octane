import { describe, expect, it } from 'vitest';
import {
    getSafetyBookletEndingKeys,
    getSafetyBookletIllustrationPath,
    getSafetyBookletIndicatorPosition,
    getSafetyBookletPageKeys,
    getSafetyBookletSafetyImagePath,
    isSafetyBookletFinalPage,
    nextSafetyBookletPage,
    previousSafetyBookletPage,
    SAFETY_BOOKLET_FINAL_PAGE
} from './safetyBooklet';

describe('safety booklet paging', () => {
    it('walks the seven pages and stops on the closing page', () => {
        expect(nextSafetyBookletPage(0)).toBe(1);
        expect(nextSafetyBookletPage(6)).toBe(7);
        expect(nextSafetyBookletPage(7)).toBe(7);
        expect(previousSafetyBookletPage(7)).toBe(6);
        expect(previousSafetyBookletPage(0)).toBe(0);
        expect(isSafetyBookletFinalPage(6)).toBe(false);
        expect(isSafetyBookletFinalPage(SAFETY_BOOKLET_FINAL_PAGE)).toBe(true);
    });

    it('names the official texts and images of a page', () => {
        expect(getSafetyBookletPageKeys(3)).toEqual({ title: 'safety.booklet.page.3.title', description: 'safety.booklet.page.3.description' });
        expect(getSafetyBookletIllustrationPath(3)).toBe('safetyquiz/page_3.png');
        expect(getSafetyBookletIllustrationPath(7)).toBe('safetyquiz/page_end.png');
        expect(getSafetyBookletSafetyImagePath(3)).toBe('safetyquiz/safety_off.png');
        expect(getSafetyBookletSafetyImagePath(7)).toBe('safetyquiz/safety_on.png');
        expect(getSafetyBookletIndicatorPosition(0)).toBe(1);
        expect(getSafetyBookletIndicatorPosition(7)).toBe(0);
    });

    it('offers the quiz unless the hotel disabled it', () => {
        expect(getSafetyBookletEndingKeys(false)).toEqual({ title: 'safety.booklet.end.title', content: 'safety.booklet.end.content' });
        expect(getSafetyBookletEndingKeys(true)).toEqual({ title: 'safety.booklet.ok.title', content: 'safety.booklet.ok.content' });
    });
});
