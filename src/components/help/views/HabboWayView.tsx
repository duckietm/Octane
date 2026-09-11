import { FC, useState } from 'react';
import { FaCheckCircle, FaChevronLeft, FaChevronRight, FaTimesCircle } from 'react-icons/fa';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useHabboWay } from '../../../hooks';
import { getHabboWayIllustrationPath, getHabboWayIndicatorPosition, getHabboWayPageKeys, isHabboWayFinalPage } from '../../../hooks/help/habboWay';

/**
 * The official "The Habbo Way" booklet (habbo_way layout): one do/don't pair
 * per page with its illustration, then a closing page that offers the quiz.
 * Illustrations are the official `habboway/page_N.png` files of the image
 * library; the page hides them when the hotel does not host them.
 */
export const HabboWayView: FC<{}> = () => {
    const {
        habboWayVisible = false,
        habboWayPage = 0,
        habboWayPageCount = 0,
        closeHabboWay = null,
        nextHabboWay = null,
        previousHabboWay = null,
        startHabboWayQuiz = null
    } = useHabboWay();
    const [brokenIllustration, setBrokenIllustration] = useState<string>(null);

    if (!habboWayVisible) return null;

    const finalPage = isHabboWayFinalPage(habboWayPage, habboWayPageCount);
    const illustrationPath = getHabboWayIllustrationPath(habboWayPage, habboWayPageCount);
    const illustrationUrl = `${GetConfigurationValue<string>('image.library.url', '')}${illustrationPath}`;
    const indicatorPosition = getHabboWayIndicatorPosition(habboWayPage, habboWayPageCount);
    const pageKeys = getHabboWayPageKeys(habboWayPage);

    return (
        <OctaneCardView
            className="octane-help octane-habbo-way min-w-0 w-[min(560px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('habbo.way.frame.title', 'The Habbo Way')} onCloseClick={closeHabboWay} />
            <OctaneCardContentView className="text-black">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <Text bold fontSize={3}>
                            {localizeWithFallback('habbo.way.frame.title', 'The Habbo Way')}
                        </Text>
                        <Text bold className="text-[#5c5c5c]" small>
                            {localizeWithFallback('habbo.way.frame.subtitle', "THE DO'S AND DON'TS")}
                        </Text>
                    </div>
                    <div className="flex items-center justify-center gap-1" aria-hidden="true">
                        {Array.from({ length: habboWayPageCount }, (_, index) => (
                            <span
                                key={index}
                                className={`inline-block h-2 w-2 rounded-full border border-[#2f2f2f] ${indicatorPosition === index + 1 ? 'bg-[#46a01e]' : 'bg-white'}`}
                            />
                        ))}
                    </div>
                    {brokenIllustration !== illustrationUrl && (
                        <div className="flex justify-center">
                            <img
                                src={illustrationUrl}
                                alt=""
                                className="max-h-[160px] w-auto [image-rendering:pixelated]"
                                onError={() => setBrokenIllustration(illustrationUrl)}
                            />
                        </div>
                    )}
                    {!finalPage ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <FaCheckCircle className="mt-0.5 shrink-0 text-[#46a01e]" />
                                    <div className="flex flex-col">
                                        <Text bold>{localizeWithFallback(pageKeys.correctTitle, '')}</Text>
                                        <Text small>{localizeWithFallback(pageKeys.correctDescription, '')}</Text>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <FaTimesCircle className="mt-0.5 shrink-0 text-[#c8382b]" />
                                    <div className="flex flex-col">
                                        <Text bold>{localizeWithFallback(pageKeys.wrongTitle, '')}</Text>
                                        <Text small>{localizeWithFallback(pageKeys.wrongDescription, '')}</Text>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <button type="button" className={`help-link ${habboWayPage === 0 ? 'invisible' : ''}`} onClick={previousHabboWay}>
                                    <FaChevronLeft className="help-link__icon" />
                                    {localizeWithFallback('habbo.way.previous.button', 'Previous')}
                                </button>
                                <button type="button" className="help-link" onClick={nextHabboWay}>
                                    {localizeWithFallback('habbo.way.next.button', 'Next')}
                                    <FaChevronRight className="help-link__icon" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Text bold fontSize={5}>
                                {localizeWithFallback('habbo.way.end.title', 'Take the quiz to win the badge!')}
                            </Text>
                            <Text small>
                                {localizeWithFallback(
                                    'habbo.way.end.content',
                                    "Now that you are familiar with Habbo Way do's and dont's, it's the time to test your knowledge. Get 5 out of 5 answers correct and claim the badge!"
                                )}
                            </Text>
                            <div className="flex items-center justify-between gap-2 pt-1">
                                <button type="button" className="help-link" onClick={previousHabboWay}>
                                    <FaChevronLeft className="help-link__icon" />
                                    {localizeWithFallback('habbo.way.back.button', 'Back')}
                                </button>
                                <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={startHabboWayQuiz}>
                                    {localizeWithFallback('habbo.way.quiz.button', 'Start quiz')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
