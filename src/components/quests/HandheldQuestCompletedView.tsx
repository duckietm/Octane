import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { HandheldCenterCard } from '../../common/handheld/HandheldCenterCard';

interface HandheldQuestCompletedViewProps {
    title: string;
    caption: string;
    text: string;
    lastQuestInCampaign: boolean;
    campaignImageUrl: string;
    /** The reward line, or null when the quest gives nothing to show. */
    reward: { text: string; iconType: number } | null;
    catalogLabel: string | null;
    onCatalog: () => void;
    onNextQuest: () => void;
    onMoreQuests: () => void;
}

/**
 * A finished quest on a phone: a centred card with the badge (the campaign's picture for its last quest), the desktop's
 * texts, the reward as a chip, the shop link and the one way on (next quest / more quests) as the green button.
 * QuestCompletedView keeps the delay, the links and the packets.
 */
export const HandheldQuestCompletedView: FC<HandheldQuestCompletedViewProps> = (props) => {
    const { title, caption, text, lastQuestInCampaign, campaignImageUrl, reward, catalogLabel, onCatalog, onNextQuest, onMoreQuests } = props;

    return (
        <HandheldCenterCard
            actions={
                <>
                    {catalogLabel && (
                        <BaseButton className="octane-handheld-rx__button" onClick={onCatalog}>
                            {catalogLabel}
                        </BaseButton>
                    )}
                    {lastQuestInCampaign ? (
                        <BaseButton className="octane-handheld-rx__button is-primary" onClick={onMoreQuests}>
                            {localizeWithFallback('quests.campaigncompleted.more', 'More quests')}
                        </BaseButton>
                    ) : (
                        <BaseButton className="octane-handheld-rx__button is-primary" onClick={onNextQuest}>
                            {localizeWithFallback('quests.completed.next', 'Next quest')}
                        </BaseButton>
                    )}
                </>
            }
            className="octane-handheld-rx-quest"
            testId="handheld-quest-completed"
            title={title}
            onClose={onNextQuest}
        >
            <div className="octane-handheld-rx-quest__hero">
                <div className="octane-quest-completed-icon octane-handheld-rx-quest__icon" data-campaign={lastQuestInCampaign}>
                    {lastQuestInCampaign && <img alt="" draggable={false} src={campaignImageUrl} />}
                </div>
                <div className="octane-handheld-rx-quest__caption">{caption}</div>
            </div>
            <p className="octane-handheld-rx__text is-centred">{text}</p>
            {reward && (
                <div className="octane-handheld-rx-quest__reward">
                    <LayoutCurrencyIcon type={reward.iconType} />
                    <span>{reward.text}</span>
                </div>
            )}
        </HandheldCenterCard>
    );
};
