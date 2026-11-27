import { FC } from 'react';
import { GetConfigurationValue, HABBO_WAY_DEFAULT_PAGE_COUNT, HABBO_WAY_QUIZ_CODE, localizeWithFallback } from '../../../api';
import correctIcon from '../../../assets/images/help/habboway/help_habboway_correct.png';
import doveOff from '../../../assets/images/help/habboway/help_habboway_dove_off.png';
import doveOn from '../../../assets/images/help/habboway/help_habboway_dove_on.png';
import wrongIcon from '../../../assets/images/help/habboway/help_habboway_wrong.png';
import { AirModalDialog } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HabboWayNavButtonView, HabboWayPageDotsView, LibraryImageView } from './HabboWayPagerView';

interface HabboWayViewProps {
    page: number;
    setPage: (page: number) => void;
    startQuiz: (quizCode: string) => void;
}

/**
 * Official HabboWayController (`habbo_way` layout, 500x470): `help.habboway.page.count` pages of
 * what is right and what is wrong, then the final page with the quiz button.
 */
export const HabboWayView: FC<HabboWayViewProps> = ({ page, setPage, startQuiz }) => {
    const finalPage = GetConfigurationValue<number>('help.habboway.page.count', HABBO_WAY_DEFAULT_PAGE_COUNT);
    const library = GetConfigurationValue<string>('image.library.url', '');
    const isFinal = page >= finalPage;

    return (
        <NativeTextTree>
            <AirModalDialog
                className="octane-habboway"
                subtitle={localizeWithFallback('habbo.way.frame.subtitle', 'WHAT IS RIGHT AND WRONG')}
                title={localizeWithFallback('habbo.way.frame.title', 'The Habbo Way')}
                width={500}
                onClose={() => setPage(-1)}
            >
                <div className="octane-habboway__indicator">
                    <HabboWayPageDotsView count={finalPage} position={isFinal ? 0 : page + 1} />
                    <img alt="" src={isFinal ? doveOn : doveOff} />
                </div>
                {!isFinal && (
                    <div className="octane-habboway__page">
                        <LibraryImageView key={page} className="octane-habboway__illustration" src={`${library}habboway/page_${page}.png`} />
                        <div className="octane-habboway__columns">
                            <div className="octane-habboway__column">
                                <div className="octane-habboway__heading">
                                    <img alt="" src={correctIcon} />
                                    {localizeWithFallback(`habbo.way.page.${page}.correct.title`, '')}
                                </div>
                                <div className="octane-habboway__text">{localizeWithFallback(`habbo.way.page.${page}.correct.description`, '')}</div>
                            </div>
                            <div className="octane-habboway__column">
                                <div className="octane-habboway__heading">
                                    <img alt="" src={wrongIcon} />
                                    {localizeWithFallback(`habbo.way.page.${page}.wrong.title`, '')}
                                </div>
                                <div className="octane-habboway__text">{localizeWithFallback(`habbo.way.page.${page}.wrong.description`, '')}</div>
                            </div>
                        </div>
                        <div className="octane-habboway__buttons">
                            {page > 0 ? (
                                <HabboWayNavButtonView caption={localizeWithFallback('habbo.way.previous.button', 'Previous')} direction="prev" onClick={() => setPage(page - 1)} />
                            ) : (
                                <span />
                            )}
                            <HabboWayNavButtonView caption={localizeWithFallback('habbo.way.next.button', 'Show next')} direction="next" onClick={() => setPage(Math.min(finalPage, page + 1))} />
                        </div>
                    </div>
                )}
                {isFinal && (
                    <div className="octane-habboway__page is-final">
                        <div className="octane-habboway__final-title">{localizeWithFallback('habbo.way.end.title', 'Take the quiz to win the badge!')}</div>
                        <LibraryImageView className="octane-habboway__final-image" src={`${library}habboway/quiz_title.png`} />
                        <div className="octane-habboway__final-text">
                            {localizeWithFallback('habbo.way.end.content', 'Now that you know the Habbo Way, test your knowledge.')}
                        </div>
                        <div className="octane-habboway__buttons">
                            <HabboWayNavButtonView caption={localizeWithFallback('habbo.way.back.button', 'Back')} direction="prev" onClick={() => setPage(finalPage - 1)} />
                            <BaseButton className="octane-habboway__action" type="button" onClick={() => startQuiz(HABBO_WAY_QUIZ_CODE)}>
                                {localizeWithFallback('habbo.way.quiz.button', 'Start the quiz')}
                            </BaseButton>
                        </div>
                    </div>
                )}
            </AirModalDialog>
        </NativeTextTree>
    );
};
