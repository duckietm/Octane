import type { CommunityGoalData, IHotelViewLandingSlot } from '@octane/renderer';
import {
    CommunityGoalProgressMessageEvent,
    CommunityGoalVoteMessageComposer,
    CommunityGoalVoteMessageEvent,
    GetCommunityGoalProgressMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import { areCommunityGoalVoteButtonsVisible, getCommunityGoalNeedleAngle, getCommunityGoalVsNeedleFrame } from '../hotelViewWidgets';

export interface HotelViewCommunityGoalVsModeWidgetProps {
    slot: IHotelViewLandingSlot;
    /** `communitygoalvsmodevote`: the variant with the two vote buttons. */
    voting: boolean;
}

const readVoteLabels = (configJson: string): string[] => {
    try {
        const parsed = JSON.parse(configJson);
        const options = parsed && typeof parsed === 'object' ? (parsed as { voteOptions?: Array<{ label?: string }> }).voteOptions : undefined;

        return Array.isArray(options) ? options.map((option) => (typeof option?.label === 'string' ? option.label : '')) : [];
    } catch {
        return [];
    }
};

/**
 * `CommunityGoalVsModeWidget.as` / `CommunityGoalVsModeWidgetWithVoting.as` +
 * the `community_goal_voting` layout (516x200): header row, caption and info
 * column, a needle meter driven by `CommunityGoalProgress` (the "vs" needle
 * frames), and - in the voting variant - two vote buttons shown until the user
 * contributed or the vote is acknowledged.
 */
export const HotelViewCommunityGoalVsModeWidget: FC<HotelViewCommunityGoalVsModeWidgetProps> = (props) => {
    const { slot, voting } = props;
    const [progress, setProgress] = useState<CommunityGoalData | null>(null);
    const [voted, setVoted] = useState(false);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    useEffect(() => {
        SendMessageComposer(new GetCommunityGoalProgressMessageComposer());
    }, []);

    useMessageEvent<CommunityGoalProgressMessageEvent>(CommunityGoalProgressMessageEvent, (event) => {
        const data = event.getParser()?.data;

        if (data) setProgress(data);
    });

    useMessageEvent<CommunityGoalVoteMessageEvent>(CommunityGoalVoteMessageEvent, (event) => {
        if (event.getParser()?.acknowledged) setVoted(true);
    });

    const vote = (option: number) => {
        setVoted(true);
        SendMessageComposer(new CommunityGoalVoteMessageComposer(option));
    };

    const frame = progress
        ? getCommunityGoalVsNeedleFrame(
              progress.communityHighestAchievedLevel,
              progress.scoreRemainingUntilNextLevel,
              progress.percentCompletionTowardsNextLevel
          )
        : 0;
    const needleAngle = getCommunityGoalNeedleAngle(frame);
    const showVoteButtons = voting && !voted && !!progress && areCommunityGoalVoteButtonsVisible(progress.personalContributionScore);
    const voteLabels = readVoteLabels(slot.configJson);
    const defaultVoteLabel = localizeWithFallback('landing.view.community_catalog_button.text', 'Vote');
    const header = localizeWithFallback('landing.view.community.headline', 'Community goal');
    const caption = slot.title || localizeWithFallback('landing.view.community.caption', 'Community goal');
    const info = slot.body || localizeWithFallback('landing.view.community.info', 'Take part and push the meter to your side!');

    return (
        <div className="hotelview-community-vs">
            <div className="hotelview-widget-header">
                <i className="hotelview-widget-header__bar" aria-hidden="true" />
                <span className="hotelview-widget-header__text">{header}</span>
                <i className="hotelview-widget-header__line" aria-hidden="true" />
            </div>
            <div className="hotelview-community-vs__info">
                <h2>{caption}</h2>
                <p>{info}</p>
                {showVoteButtons && (
                    <div className="hotelview-community-vs__votes">
                        <button type="button" className="hotelview-widget-button" onClick={() => vote(1)}>
                            {voteLabels[0] || defaultVoteLabel}
                        </button>
                        <button type="button" className="hotelview-widget-button" onClick={() => vote(2)}>
                            {voteLabels[1] || defaultVoteLabel}
                        </button>
                    </div>
                )}
            </div>
            <div className="hotelview-community-vs__meter" aria-hidden="true">
                <img src={`${imageLibraryUrl}reception/meter_level_0.png`} alt="" />
                <i className="hotelview-community-vs__needle" style={{ transform: `rotate(${needleAngle}deg)` }} />
            </div>
        </div>
    );
};
