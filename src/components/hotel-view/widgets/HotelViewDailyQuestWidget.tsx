import { ForwardToSomeRoomMessageComposer } from '@octane/renderer';
import { FC, ReactNode, useEffect, useState } from 'react';
import { GetConfigurationValue, getQuestImageUrl, getQuestName, localizeWithFallback, SendMessageComposer } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useQuests } from '../../../hooks';

/**
 * DailyQuestWidget (daily_quest.xml) fed by QuestDaily: the quest of the day with its chain texts,
 * start / cancel, "another easy|hard quest" and the easy / hard switch, and the "go" button that
 * forwards to a room of `landing.view.roomcategory` while a quest runs.
 */
export const HotelViewDailyQuestWidget: FC<{ fallback: ReactNode }> = ({ fallback }) => {
    const { dailyQuest = null, requestDailyQuest = null, acceptQuest = null, cancelDailyQuest = null } = useQuests();
    const [index, setIndex] = useState(0);
    const quest = dailyQuest?.quest ?? null;
    const easyCount = dailyQuest?.easyQuestCount ?? 0;
    const hardCount = dailyQuest?.hardQuestCount ?? 0;

    // refresh(): the widget starts with the first easy quest.
    useEffect(() => {
        if (requestDailyQuest) requestDailyQuest(true, 0);
    }, [requestDailyQuest]);

    const chainKey = quest ? `quests.${quest.campaignCode}.${quest.chainCode}` : '';
    const caption = quest
        ? localizeWithFallback(`${chainKey}.chaincaption`, getQuestName(quest))
        : localizeWithFallback('landing.view.quest.currenttask.alldone.caption', 'All done!');
    const info = quest
        ? localizeWithFallback(`${chainKey}.chaininfo`, '')
        : localizeWithFallback('landing.view.quest.currenttask.alldone.info', 'You have completed all the available quests! Well done! Check back later for more.');
    const showNext = !!quest && !quest.accepted && (quest.easy ? easyCount : hardCount) > 1;
    const showDifficulty = !!quest && !quest.accepted && easyCount > 0 && hardCount > 0;

    const switchDifficulty = (easy: boolean) => {
        setIndex(0);
        requestDailyQuest && requestDailyQuest(easy, 0);
    };

    const nextQuest = () => {
        if (!quest || !requestDailyQuest) return;

        const next = index + 1;

        setIndex(next);
        requestDailyQuest(quest.easy, next);
    };

    const goToRoom = () => {
        const category = GetConfigurationValue<string>('landing.view.roomcategory', 'random_friending_room');

        if (category) SendMessageComposer(new ForwardToSomeRoomMessageComposer(category));
    };

    // Until the server answered, the slot keeps the texts the staff wrote.
    if (!dailyQuest) return <>{fallback}</>;

    return (
        <NativeTextTree>
            <div className="hotelview-daily-quest">
                <div className="hotelview-daily-quest-header">
                    <span className="hotelview-widget-title">
                        {quest?.accepted
                            ? localizeWithFallback('landing.view.quest.title.accepted', 'Your current quest')
                            : localizeWithFallback('landing.view.quest.title.notaccepted', 'Quests')}
                    </span>
                    {showDifficulty && (
                        <span className="hotelview-daily-quest-difficulty">
                            <BaseButton type="button" className={quest.easy ? 'hotelview-daily-quest-selected' : ''} disabled={quest.easy} onClick={() => switchDifficulty(true)}>
                                {localizeWithFallback('landing.view.quest.easy', 'Easy')}
                            </BaseButton>
                            <span>|</span>
                            <BaseButton type="button" className={!quest.easy ? 'hotelview-daily-quest-selected' : ''} disabled={!quest.easy} onClick={() => switchDifficulty(false)}>
                                {localizeWithFallback('landing.view.quest.hard', 'Hard')}
                            </BaseButton>
                        </span>
                    )}
                </div>
                <div className="hotelview-daily-quest-body">
                    {quest && <img className="hotelview-daily-quest-image" src={getQuestImageUrl(quest, false)} alt="" draggable={false} />}
                    <div className="hotelview-daily-quest-copy">
                        <h2>{caption}</h2>
                        {info && <p>{info}</p>}
                        {quest?.accepted && (
                            <p
                                className="hotelview-daily-quest-current"
                                // `<b>Current task:</b> %task%.` is markup of the external texts, the quest name is escaped.
                                dangerouslySetInnerHTML={{
                                    __html: localizeWithFallback('landing.view.quest.currenttask', '<b>Current task:</b> %task%.', ['task'], [escapeHtml(getQuestName(quest))])
                                }}
                            />
                        )}
                        {quest && !quest.accepted && (
                            <BaseButton type="button" className="hotelview-widget-button" onClick={() => {
                                    acceptQuest && acceptQuest(quest.id);
                                    // The server answers the activation with the quest, not the daily widget: ask again.
                                    requestDailyQuest && requestDailyQuest(quest.easy, index);
                                }}>
                                {localizeWithFallback('landing.view.quest.accept', 'Start >>')}
                            </BaseButton>
                        )}
                        {quest?.accepted && (
                            <BaseButton type="button" className="hotelview-widget-button" onClick={goToRoom}>
                                {localizeWithFallback('landing.view.quest.go', 'Go >>')}
                            </BaseButton>
                        )}
                        {showNext && (
                            <BaseButton type="button" className="hotelview-widget-link" onClick={nextQuest}>
                                {quest.easy
                                    ? localizeWithFallback('landing.view.quest.nextquest.easy', 'Show me another easy quest!')
                                    : localizeWithFallback('landing.view.quest.nextquest.hard', 'Show me another hard quest!')}
                            </BaseButton>
                        )}
                        {quest?.accepted && (
                            <BaseButton type="button" className="hotelview-widget-link" onClick={() => {
                                cancelDailyQuest && cancelDailyQuest();
                                requestDailyQuest && requestDailyQuest(quest.easy, index);
                            }}>
                                {localizeWithFallback('landing.view.quest.cancel', 'Cancel quest')}
                            </BaseButton>
                        )}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};

const escapeHtml = (value: string): string =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
