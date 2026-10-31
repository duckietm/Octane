import { CreateLinkEvent } from '@octane/renderer';
import { FC, ReactNode, useEffect, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import {
    campaignizeAssetUri,
    COMMUNITY_GOAL_METER_BUILDUP_MS,
    COMMUNITY_GOAL_METER_DELAY_MS,
    getCommunityGoalNeedleFrame,
    getCommunityGoalVsNeedleFrame,
    isCommunityGoalLevelLit
} from '../../../api/hotel-view/LandingViewWidgets';
import { GetCommunityGoalNeedleUrl } from '../../../assets/images/hotelview/community-goal';
import { BaseButton } from '../../../common/BaseButton';
import { useCommunityGoalProgress } from '../../../hooks';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export type CommunityGoalWidgetMode = 'goal' | 'vs' | 'vsvote';

/** `${key}.<goalCode>`, then `${key}`, then the slot's own text. */
const goalText = (key: string, goalCode: string, fallback: string, parameters: string[] = null, values: string[] = null): string =>
    localizeWithFallback(`${key}.${goalCode}`, localizeWithFallback(key, fallback, parameters, values), parameters, values);

const METER_LEVELS = [0, 1, 2, 3];

/**
 * CommunityGoalWidget (community_goal.xml), CommunityGoalVsModeWidget and its voting variant
 * (community_goal_voting.xml): the texts of the goal code, the level meter from the image library
 * (`reception/meter_level_<n>_<goal>.png`) and the needle. The tiered meter waits 1.5 s and climbs
 * for 1 s; the vs meter leans to the leading side; the voting variant shows two vote buttons until
 * the player contributed or voted.
 */
export const HotelViewCommunityGoalWidget: FC<{ mode: CommunityGoalWidgetMode; fallback: ReactNode; title: string; body: string; link: string; onLink: (link: string) => void }> = ({
    mode,
    fallback,
    title,
    body,
    link,
    onLink
}) => {
    const { goal = null, receivedAt = 0, voted = false, vote = null } = useCommunityGoalProgress();
    const [buildup, setBuildup] = useState(mode === 'goal' ? 0 : 1);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    // update(): after the initial delay the needle climbs to the goal frame.
    useEffect(() => {
        if (mode !== 'goal' || !receivedAt) return;

        setBuildup(0);

        let frame = 0;
        const start = performance.now() + COMMUNITY_GOAL_METER_DELAY_MS;
        const tick = (now: number) => {
            const progress = Math.max(0, Math.min(1, (now - start) / COMMUNITY_GOAL_METER_BUILDUP_MS));

            setBuildup(progress);

            if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [mode, receivedAt]);

    if (!goal || !goal.goalCode) return <>{fallback}</>;

    const code = goal.goalCode;
    const target =
        mode === 'goal'
            ? getCommunityGoalNeedleFrame(goal.communityHighestAchievedLevel, goal.percentCompletionTowardsNextLevel)
            : getCommunityGoalVsNeedleFrame(goal.communityHighestAchievedLevel, goal.percentCompletionTowardsNextLevel, goal.scoreRemainingUntilNextLevel);
    const frame = mode === 'goal' ? Math.floor(target * buildup) : target;
    const needleUrl = GetCommunityGoalNeedleUrl(frame);
    const interactive = GetConfigurationValue<boolean>('landing.view.community.interactive', true) !== false;
    const catalogTarget = GetConfigurationValue<string>('landing.view.community.catalog.target', '');
    const meterParameters = ['userRank', 'userAmount', 'totalAmount'];
    const meterValues = [String(goal.personalContributionRank), String(goal.personalContributionScore), String(goal.communityTotalScore)];
    const showVotes = mode === 'vsvote' && goal.personalContributionScore === 0 && !voted;

    return (
        <NativeTextTree>
            <div className={`hotelview-community-goal hotelview-community-goal-${mode}`}>
                <div className="hotelview-community-goal-copy">
                    <span className="hotelview-widget-title">{goalText('landing.view.community.headline', code, title)}</span>
                    <h2>{goalText('landing.view.community.caption', code, title)}</h2>
                    <p>{goalText('landing.view.community.info', code, body)}</p>
                    {mode === 'goal' && interactive && (
                        <BaseButton
                            type="button"
                            className="hotelview-widget-button"
                            onClick={() => (catalogTarget ? CreateLinkEvent(`catalog/open/${catalogTarget}`) : link && onLink(link))}
                        >
                            {goalText('landing.view.community_catalog_button.text', code, localizeWithFallback('landing.view.community.button', 'Let\'s get started!'))}
                        </BaseButton>
                    )}
                    {showVotes && vote && (
                        <div className="hotelview-community-goal-votes">
                            <BaseButton type="button" className="hotelview-widget-button" onClick={() => vote(1)}>
                                {goalText('landing.view.vote_one_button.text', code, 'Vote 1')}
                            </BaseButton>
                            <BaseButton type="button" className="hotelview-widget-button" onClick={() => vote(2)}>
                                {goalText('landing.view.vote_two_button.text', code, 'Vote 2')}
                            </BaseButton>
                        </div>
                    )}
                </div>
                <div className="hotelview-community-goal-meter">
                    {METER_LEVELS.map((level) =>
                        level === 0 || (mode === 'goal' && isCommunityGoalLevelLit(frame, level)) ? (
                            <img
                                key={level}
                                className={`hotelview-community-goal-meter-level hotelview-community-goal-meter-level-${level}`}
                                src={campaignizeAssetUri(`${imageLibraryUrl}reception/meter_level_${level}.png`, code)}
                                alt=""
                                draggable={false}
                                onError={(event) => {
                                    event.currentTarget.style.visibility = 'hidden';
                                }}
                            />
                        ) : null
                    )}
                    {needleUrl && <img className="hotelview-community-goal-needle" src={needleUrl} alt="" draggable={false} />}
                    {mode === 'goal' && (
                        <strong className="hotelview-community-goal-status">
                            {goalText('landing.view.community.meter', code, String(goal.communityTotalScore), meterParameters, meterValues)}
                        </strong>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
