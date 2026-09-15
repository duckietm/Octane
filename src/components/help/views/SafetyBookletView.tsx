import { FC, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useHabboWay, useSafetyBooklet } from '../../../hooks';
import {
    getSafetyBookletEndingKeys,
    getSafetyBookletIllustrationPath,
    getSafetyBookletIndicatorPosition,
    getSafetyBookletPageKeys,
    getSafetyBookletSafetyImagePath,
    isSafetyBookletFinalPage,
    SAFETY_BOOKLET_FINAL_PAGE
} from '../../../hooks/help/safetyBooklet';

/**
 * The official safety booklet (safety_booklet layout, SafetyBookletController):
 * seven safety pages with their `safetyquiz/page_N.png` illustration and the
 * lock badge, then the closing page that starts the safety quiz (or only
 * thanks the reader when the hotel disables the quiz). Like every official
 * help modal it sits on the `ui_help_modal` dimmed backdrop.
 */
export const SafetyBookletView: FC<{}> = () => {
    const {
        safetyBookletVisible = false,
        safetyBookletPage = 0,
        safetyQuizDisabled = false,
        closeSafetyBooklet = null,
        nextSafetyBooklet = null,
        previousSafetyBooklet = null
    } = useSafetyBooklet();
    const { startSafetyQuiz = null } = useHabboWay();
    const [brokenImages, setBrokenImages] = useState<string[]>([]);

    if (!safetyBookletVisible) return null;

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const finalPage = isSafetyBookletFinalPage(safetyBookletPage);
    const illustrationUrl = `${imageLibraryUrl}${getSafetyBookletIllustrationPath(safetyBookletPage)}`;
    const safetyImageUrl = `${imageLibraryUrl}${getSafetyBookletSafetyImagePath(safetyBookletPage)}`;
    const indicatorPosition = getSafetyBookletIndicatorPosition(safetyBookletPage);
    const pageKeys = getSafetyBookletPageKeys(safetyBookletPage);
    const endingKeys = getSafetyBookletEndingKeys(safetyQuizDisabled);

    const showImage = (url: string) => !brokenImages.includes(url);
    const markBroken = (url: string) => setBrokenImages((current) => (current.includes(url) ? current : [...current, url]));

    const startQuiz = () => {
        closeSafetyBooklet?.();
        startSafetyQuiz?.();
    };

    return (
        <div className="octane-help-modal-backdrop">
            <OctaneCardView
                className="octane-help octane-safety-booklet min-w-0 w-[min(560px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
                uniqueKey="safety-booklet"
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('safety.booklet.frame.title', 'Stay safe in Habbo')} onCloseClick={closeSafetyBooklet} />
                <OctaneCardContentView className="text-black">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                                <Text bold fontSize={3}>
                                    {localizeWithFallback('safety.booklet.frame.title', 'Stay safe in Habbo')}
                                </Text>
                                <Text bold className="text-[#5c5c5c]" small>
                                    {localizeWithFallback('safety.booklet.frame.subtitle', 'SAFETY BOOKLET')}
                                </Text>
                            </div>
                            {showImage(safetyImageUrl) && (
                                <img
                                    src={safetyImageUrl}
                                    alt=""
                                    className="h-[40px] w-auto [image-rendering:pixelated]"
                                    onError={() => markBroken(safetyImageUrl)}
                                />
                            )}
                        </div>
                        {!safetyQuizDisabled && !finalPage && (
                            <Text small className="text-[#5c5c5c]">
                                {localizeWithFallback('safety.booklet.explanation.1', 'You can find the Safety Quiz at the end of this Safety Booklet.')}{' '}
                                {localizeWithFallback(
                                    'safety.booklet.explanation.2',
                                    "It may feel difficult at first, but don't worry - you can try again right away."
                                )}
                            </Text>
                        )}
                        <div className="flex items-center justify-center gap-1" aria-hidden="true">
                            {Array.from({ length: SAFETY_BOOKLET_FINAL_PAGE }, (_, index) => (
                                <span
                                    key={index}
                                    className={`inline-block h-2 w-2 rounded-full border border-[#2f2f2f] ${indicatorPosition === index + 1 ? 'bg-[#46a01e]' : 'bg-white'}`}
                                />
                            ))}
                        </div>
                        {showImage(illustrationUrl) && (
                            <div className="flex justify-center">
                                <img
                                    src={illustrationUrl}
                                    alt=""
                                    className="max-h-[160px] w-auto [image-rendering:pixelated]"
                                    onError={() => markBroken(illustrationUrl)}
                                />
                            </div>
                        )}
                        {!finalPage ? (
                            <>
                                <div className="flex flex-col">
                                    <Text bold>{localizeWithFallback(pageKeys.title, '')}</Text>
                                    <Text small>{localizeWithFallback(pageKeys.description, '')}</Text>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <button type="button" className={`help-link ${safetyBookletPage === 0 ? 'invisible' : ''}`} onClick={previousSafetyBooklet}>
                                        <FaChevronLeft className="help-link__icon" />
                                        {localizeWithFallback('habbo.way.previous.button', 'Previous')}
                                    </button>
                                    <button type="button" className="help-link" onClick={nextSafetyBooklet}>
                                        {localizeWithFallback('habbo.way.next.button', 'Next')}
                                        <FaChevronRight className="help-link__icon" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Text bold fontSize={5}>
                                    {localizeWithFallback(endingKeys.title, safetyQuizDisabled ? 'Thanks For Reading!' : 'Now take our quiz!')}
                                </Text>
                                <Text small>{localizeWithFallback(endingKeys.content, '')}</Text>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <button type="button" className="help-link" onClick={previousSafetyBooklet}>
                                        <FaChevronLeft className="help-link__icon" />
                                        {localizeWithFallback('habbo.way.back.button', 'Back')}
                                    </button>
                                    {safetyQuizDisabled ? (
                                        <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={closeSafetyBooklet}>
                                            {localizeWithFallback('habbo.way.ok.button', 'Got it!')}
                                        </button>
                                    ) : (
                                        <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={startQuiz}>
                                            {localizeWithFallback('habbo.way.quiz.button', 'Start quiz')}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </div>
    );
};
