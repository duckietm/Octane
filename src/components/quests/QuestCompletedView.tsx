import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { getActivityPointName, getCampaignImageUrl, getCampaignName, getQuestCompletedText, isQuestRewardVisible, localizeWithFallback } from '../../api';
import { Button, DraggableWindowPosition } from '../../common';
import { useQuests } from '../../hooks';
import { OctaneCard } from '../../layout';

/** The official dialog waits two seconds after the completion packet before it appears. */
const SHOW_DELAY_MS = 2000;

/**
 * The QuestCompletedDialog (426x215): congratulations, the quest's completed text, the reward and
 * either the "next quest" button or, for the last quest of a campaign, the "more quests" button.
 */
export const QuestCompletedView: FC<{}> = () => {
    const { completion = null, requestNextQuest = null, clearCompletion = null } = useQuests();
    const [visibleFor, setVisibleFor] = useState<number>(0);

    useEffect(() => {
        if (!completion || !completion.showDialog) {
            setVisibleFor(0);

            return;
        }

        const timeout = window.setTimeout(() => setVisibleFor(completion.receivedAt), SHOW_DELAY_MS);

        return () => window.clearTimeout(timeout);
    }, [completion]);

    if (!completion || !completion.showDialog || visibleFor !== completion.receivedAt) return null;

    const quest = completion.quest;
    const lastQuestInCampaign = quest.lastQuestInCampaign;
    const campaignName = getCampaignName(quest.campaignCode);
    const rewardVisible = isQuestRewardVisible(quest.activityPointType, quest.rewardCurrencyAmount);
    const currencyName = getActivityPointName(quest.activityPointType);

    const close = () => clearCompletion && clearCompletion();

    const onNextQuest = () => {
        requestNextQuest && requestNextQuest();
        close();
    };

    const onMoreQuests = () => {
        CreateLinkEvent('quests/show');
        close();
    };

    const onCatalog = () => {
        CreateLinkEvent(quest.catalogPageName && quest.catalogPageName.length ? `catalog/open/${quest.catalogPageName}` : 'catalog/open');
        close();
    };

    return (
        <OctaneCard className="octane-quest-completed" uniqueKey="quest-completed" windowPosition={DraggableWindowPosition.CENTER}>
            <OctaneCard.Header
                headerText={
                    lastQuestInCampaign
                        ? localizeWithFallback('quests.completed.campaign.title', '%category% completed!', ['category'], [campaignName])
                        : localizeWithFallback('quests.completed.quest.title', '%category% quest completed', ['category'], [campaignName])
                }
                onCloseClick={onNextQuest}
            />
            <OctaneCard.Content className="octane-quest-completed-content">
                <div className="octane-quest-completed-banner">
                    <div className="octane-quest-completed-icon" data-campaign={lastQuestInCampaign}>
                        {lastQuestInCampaign && <img src={getCampaignImageUrl(quest.campaignCode)} alt="" draggable={false} />}
                    </div>
                    <div className="octane-quest-completed-texts">
                        <div className="octane-quest-completed-congrats">
                            {lastQuestInCampaign
                                ? localizeWithFallback('quests.completed.campaign.caption', 'Campaign completed!')
                                : localizeWithFallback('quests.completed.quest.caption', 'Quest completed!')}
                        </div>
                        <div className="octane-quest-completed-desc">{getQuestCompletedText(quest)}</div>
                        {rewardVisible && (
                            <div className="octane-quest-completed-reward">
                                {localizeWithFallback(
                                    'quests.completed.reward',
                                    'You earned %amount% %currencyname%!',
                                    ['amount', 'currencyname'],
                                    [String(quest.rewardCurrencyAmount), currencyName]
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="octane-quest-completed-actions">
                    {!lastQuestInCampaign && rewardVisible && (
                        <span className="octane-quest-link" onClick={onCatalog}>
                            {localizeWithFallback('quests.completed.cataloglink', 'Spend your %currencyname%', ['currencyname'], [currencyName])}
                        </span>
                    )}
                    <div className="grow" />
                    {lastQuestInCampaign && (
                        <Button variant="success" onClick={onMoreQuests}>
                            {localizeWithFallback('quests.campaigncompleted.more', 'More quests')}
                        </Button>
                    )}
                    {!lastQuestInCampaign && (
                        <Button variant="success" onClick={onNextQuest}>
                            {localizeWithFallback('quests.completed.next', 'Next quest')}
                        </Button>
                    )}
                </div>
            </OctaneCard.Content>
        </OctaneCard>
    );
};
