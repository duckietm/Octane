import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback, SAFETY_BOOKLET_FINAL_PAGE, SAFETY_QUIZ_CODE } from '../../../api';
import infoIcon from '../../../assets/images/help/habboway/common_info_icon_grey.png';
import { AirModalDialog } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HabboWayNavButtonView, HabboWayPageDotsView, LibraryImageView } from './HabboWayPagerView';

interface SafetyBookletViewProps {
    page: number;
    setPage: (page: number) => void;
    startQuiz: (quizCode: string) => void;
}

/**
 * Official SafetyBookletController (`safety_booklet` layout, 500x530): seven safety tips, then the
 * page that starts the safety quiz (or, with `safety_quiz.disabled`, the "thanks for reading" page).
 */
export const SafetyBookletView: FC<SafetyBookletViewProps> = ({ page, setPage, startQuiz }) => {
    const library = GetConfigurationValue<string>('image.library.url', '');
    const quizDisabled = GetConfigurationValue<boolean>('safety_quiz.disabled', false);
    const isFinal = page >= SAFETY_BOOKLET_FINAL_PAGE;
    const back = () => setPage(Math.max(0, page - 1));

    return (
        <NativeTextTree>
            <AirModalDialog
                className="octane-habboway is-safety"
                subtitle={localizeWithFallback('safety.booklet.frame.subtitle', 'SAFETY GUIDE')}
                title={localizeWithFallback('safety.booklet.frame.title', 'Stay safe in Habbo')}
                width={500}
                onClose={() => setPage(-1)}
            >
                <div className="octane-habboway__indicator">
                    <HabboWayPageDotsView count={SAFETY_BOOKLET_FINAL_PAGE} position={isFinal ? 0 : page + 1} />
                    <LibraryImageView className="octane-habboway__safety-icon" src={`${library}safetyquiz/${isFinal ? 'safety_on' : 'safety_off'}.png`} />
                </div>
                {!quizDisabled && (
                    <div className="octane-habboway__explanation">
                        <img alt="" src={infoIcon} />
                        <div>
                            <div>{localizeWithFallback('safety.booklet.explanation.1', 'The safety quiz is at the end of this booklet.')}</div>
                            <div>{localizeWithFallback('safety.booklet.explanation.2', 'It looks hard, but you can try again straight away.')}</div>
                        </div>
                    </div>
                )}
                {!isFinal && (
                    <div className="octane-habboway__page is-booklet">
                        <div className="octane-habboway__booklet-row">
                            <LibraryImageView key={page} className="octane-habboway__booklet-image" src={`${library}safetyquiz/page_${page}.png`} />
                            <div className="octane-habboway__booklet-copy">
                                <div className="octane-habboway__heading">{localizeWithFallback(`safety.booklet.page.${page}.title`, '')}</div>
                                <div className="octane-habboway__text">{localizeWithFallback(`safety.booklet.page.${page}.description`, '')}</div>
                            </div>
                        </div>
                        <div className="octane-habboway__buttons">
                            {page > 0 ? <HabboWayNavButtonView caption={localizeWithFallback('habbo.way.previous.button', 'Previous')} direction="prev" onClick={back} /> : <span />}
                            <HabboWayNavButtonView
                                caption={localizeWithFallback('habbo.way.next.button', 'Show next')}
                                direction="next"
                                onClick={() => setPage(Math.min(SAFETY_BOOKLET_FINAL_PAGE, page + 1))}
                            />
                        </div>
                    </div>
                )}
                {isFinal && (
                    <div className="octane-habboway__page is-final">
                        <div className="octane-habboway__final-title">
                            {quizDisabled
                                ? localizeWithFallback('safety.booklet.ok.title', 'Thanks for reading!')
                                : localizeWithFallback('safety.booklet.end.title', 'Now take our quiz!')}
                        </div>
                        <LibraryImageView className="octane-habboway__final-image" src={`${library}safetyquiz/start_quiz.png`} />
                        <div className="octane-habboway__final-text">
                            {quizDisabled
                                ? localizeWithFallback('safety.booklet.ok.content', 'Remember these rules and you will get the best out of Habbo!')
                                : localizeWithFallback('safety.booklet.end.content', 'Now that you know our safety tips, take the quiz.')}
                        </div>
                        <div className="octane-habboway__buttons">
                            <HabboWayNavButtonView caption={localizeWithFallback('habbo.way.back.button', 'Back')} direction="prev" onClick={back} />
                            {quizDisabled ? (
                                <BaseButton
                                    className="octane-habboway__action"
                                    type="button"
                                    onClick={() => {
                                        startQuiz(SAFETY_QUIZ_CODE);
                                        setPage(-1);
                                    }}
                                >
                                    {localizeWithFallback('habbo.way.ok.button', 'Read it!')}
                                </BaseButton>
                            ) : (
                                <BaseButton className="octane-habboway__action" type="button" onClick={() => startQuiz(SAFETY_QUIZ_CODE)}>
                                    {localizeWithFallback('habbo.way.quiz.button', 'Start the quiz')}
                                </BaseButton>
                            )}
                        </div>
                    </div>
                )}
            </AirModalDialog>
        </NativeTextTree>
    );
};
