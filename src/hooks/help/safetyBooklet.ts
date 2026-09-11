/**
 * Pure step logic of the official safety booklet (SafetyBookletController in
 * the AIR client, `safety_booklet` layout).
 *
 * Seven safety pages (0..6, `safety.booklet.page.N.title/description`) with
 * the `safetyquiz/page_N.png` illustration, then a closing page (7) that
 * either offers the safety quiz or, when the hotel disables the quiz
 * (`safety_quiz.disabled`), just thanks the reader.
 */

export const SAFETY_BOOKLET_START_PAGE = 0;
export const SAFETY_BOOKLET_FINAL_PAGE = 7;

export const isSafetyBookletFinalPage = (page: number): boolean => page >= SAFETY_BOOKLET_FINAL_PAGE;

export const nextSafetyBookletPage = (page: number): number => Math.min(SAFETY_BOOKLET_FINAL_PAGE, page + 1);

export const previousSafetyBookletPage = (page: number): number => Math.max(SAFETY_BOOKLET_START_PAGE, page - 1);

export const getSafetyBookletPageKeys = (page: number) => ({
    title: `safety.booklet.page.${page}.title`,
    description: `safety.booklet.page.${page}.description`
});

/** `${image.library.url}safetyquiz/page_N.png`, `page_end.png` on the closing page. */
export const getSafetyBookletIllustrationPath = (page: number): string =>
    isSafetyBookletFinalPage(page) ? 'safetyquiz/page_end.png' : `safetyquiz/page_${page}.png`;

/** The lock badge next to the pages: off while reading, on once the booklet is finished. */
export const getSafetyBookletSafetyImagePath = (page: number): string =>
    isSafetyBookletFinalPage(page) ? 'safetyquiz/safety_on.png' : 'safetyquiz/safety_off.png';

/** Page dots widget position: 1 based while reading, 0 on the closing page. */
export const getSafetyBookletIndicatorPosition = (page: number): number => (isSafetyBookletFinalPage(page) ? 0 : page + 1);

/** Which closing page to show: the quiz offer, or the plain thanks when the quiz is disabled. */
export const getSafetyBookletEndingKeys = (quizDisabled: boolean) =>
    quizDisabled
        ? { title: 'safety.booklet.ok.title', content: 'safety.booklet.ok.content' }
        : { title: 'safety.booklet.end.title', content: 'safety.booklet.end.content' };
