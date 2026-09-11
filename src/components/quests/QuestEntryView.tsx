import { QuestMessageData } from '@octane/renderer';
import { FC } from 'react';
import {
    formatFriendlySeconds,
    getActivityPointIconType,
    getCampaignCounterStyle,
    getCampaignImageUrl,
    getCampaignName,
    getQuestDescription,
    getQuestHint,
    getQuestImageUrl,
    getQuestName,
    isQuestRewardVisible,
    localizeWithFallback
} from '../../api';
import { Button, LayoutCurrencyIcon, Text } from '../../common';

interface QuestEntryViewProps {
    quest: QuestMessageData;
    showHint?: boolean;
    onAccept: (quest: QuestMessageData) => void;
    onReject: (quest: QuestMessageData) => void;
    onDetails?: (quest: QuestMessageData) => void;
}

/**
 * One row of the official quests list: the Campaign block (103x114) followed by the Quest block
 * (362x114), or the CampaignCompleted block once every quest of the campaign is done.
 */
export const QuestEntryView: FC<QuestEntryViewProps> = (props) => {
    const { quest, showHint = false, onAccept = null, onReject = null, onDetails = null } = props;

    const completedCampaign = quest.completedCampaign;
    const accepted = quest.accepted;
    const waiting = quest.waitPeriodSeconds > 0;
    const counterStyle = getCampaignCounterStyle(quest.completedQuestsInCampaign, completedCampaign);
    const description = getQuestDescription(quest);
    const hint = showHint ? getQuestHint(quest) : '';

    return (
        <div className="octane-quest-entry" data-accepted={accepted} data-completed={completedCampaign}>
            <div className="octane-quest-campaign">
                <div className="octane-quest-campaign-header">{getCampaignName(quest.campaignCode)}</div>
                <img className="octane-quest-campaign-image" src={getCampaignImageUrl(quest.campaignCode)} alt="" draggable={false} />
                <div className={`octane-quest-campaign-counter octane-quest-campaign-counter-${counterStyle}`}>
                    {quest.completedQuestsInCampaign}/{quest.questCountInCampaign}
                </div>
            </div>
            {completedCampaign && (
                <div className="octane-quest-block octane-quest-block-completed">
                    <Text className="octane-quest-completed-text">
                        {localizeWithFallback('quests.list.completed', 'You have completed all the quests of this campaign!')}
                    </Text>
                    <div className="octane-quest-completed-image" />
                </div>
            )}
            {!completedCampaign && (
                <div className="octane-quest-block">
                    <div className="octane-quest-block-header">
                        <span className="octane-quest-block-title">
                            {waiting ? localizeWithFallback('quests.list.questdelayed', 'Next quest') : getQuestName(quest)}
                        </span>
                        {quest.isSeasonal && quest.secondsLeft > 0 && (
                            <span className="octane-quest-block-timeleft">{formatFriendlySeconds(quest.secondsLeft)}</span>
                        )}
                    </div>
                    <img className="octane-quest-block-image" src={getQuestImageUrl(quest)} alt="" draggable={false} />
                    <div className="octane-quest-block-body">
                        {waiting && (
                            <>
                                <Text small>{localizeWithFallback('quests.list.nextquestavailable', 'The next quest will be available in')}</Text>
                                <Text bold className="octane-quest-delay">
                                    {formatFriendlySeconds(quest.waitPeriodSeconds)}
                                </Text>
                            </>
                        )}
                        {!waiting && <Text className="octane-quest-desc">{description}</Text>}
                        {!waiting && hint.length > 0 && <Text small className="octane-quest-hint" dangerouslySetInnerHTML={{ __html: hint }} />}
                        {isQuestRewardVisible(quest.activityPointType, quest.rewardCurrencyAmount) && !waiting && (
                            <div className="octane-quest-reward">
                                <span>{localizeWithFallback('quests.list.rewardcaption', 'Reward:')}</span>
                                <span className="font-bold">{quest.rewardCurrencyAmount}</span>
                                <LayoutCurrencyIcon type={getActivityPointIconType(quest.activityPointType)} />
                            </div>
                        )}
                    </div>
                    <div className="octane-quest-block-actions">
                        {!accepted && !waiting && (
                            <Button variant="success" className="octane-quest-accept" onClick={() => onAccept && onAccept(quest)}>
                                {localizeWithFallback('quests.list.accept', 'Accept quest')}
                            </Button>
                        )}
                        {accepted && (
                            <span className="octane-quest-link" onClick={() => onReject && onReject(quest)}>
                                {localizeWithFallback('quests.list.reject', 'Cancel quest')}
                            </span>
                        )}
                        {onDetails && !showHint && (
                            <span className="octane-quest-link" onClick={() => onDetails(quest)}>
                                {localizeWithFallback('quests.tracker.moreinfo', 'More info')}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
