import type { PrizeData } from '@octane/renderer';
import { GetSessionDataManager } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { GetConfigurationValue, LocalizeBadgeName, localizeWithFallback } from '../../../api';
import { getPrizeRankLimits, getPrizesUserRankKey } from '../../../api/hotel-view/LandingViewWidgets';
import { BaseButton } from '../../../common/BaseButton';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../common';
import { useCommunityGoalEarnedPrizes, useCommunityGoalProgress, useUserDataSnapshot } from '../../../hooks';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const PRIZE_LEVELS = [1, 2, 3];

/** `landing.view.competition.prizes.<key>` */
const prizesKey = (key: string) => `landing.view.competition.prizes.${key}`;

/** The name a prize is shown with: the server's own name, the badge name or the furni name. */
const getPrizeName = (prize: PrizeData): string => {
    if (prize.localizedName) return prize.localizedName;
    if (prize.badge) return LocalizeBadgeName(prize.rewardCode);

    const manager = GetSessionDataManager();

    return manager?.getFloorItemDataByName(prize.rewardCode)?.name ?? manager?.getWallItemDataByName(prize.rewardCode)?.name ?? prize.rewardCode;
};

/**
 * The prizes the player earned in finished goals (`landing.view.competition.redeemprize.<goal>`,
 * "Your final rank was %rank%, you earned %prize%") with the redeem button.
 */
const EarnedPrizesView: FC<{ prizes: PrizeData[]; redeeming: number; redeem: (communityGoalId: number) => void }> = ({ prizes, redeeming, redeem }) => (
    <NativeTextTree>
        <div className="hotelview-competition-earned-prizes">
            {prizes.map((prize) => {
                const name = getPrizeName(prize);

                return (
                    <div key={prize.communityGoalId} className="hotelview-competition-earned-prize">
                        {prize.badge && <LayoutBadgeImageView badgeCode={prize.rewardCode} />}
                        <div className="hotelview-competition-earned-prize-copy">
                            <p>
                                {localizeWithFallback(
                                    `landing.view.competition.redeemprize.${prize.communityGoalCode}`,
                                    'Your final rank in the challenge was %rank%. You earned %prize%. Well done!',
                                    ['rank', 'prize'],
                                    [String(prize.userRank), name]
                                )}
                            </p>
                            <BaseButton type="button" className="hotelview-widget-button" disabled={redeeming === prize.communityGoalId} onClick={() => redeem(prize.communityGoalId)}>
                                {localizeWithFallback('landing.view.competition.redeemprize.redeem', 'Claim your prize!')}
                            </BaseButton>
                        </div>
                    </div>
                );
            })}
        </div>
    </NativeTextTree>
);

/**
 * CommunityGoalPrizesWidget (achievement_competition_prizes.xml): the texts of the goal code, the
 * reward image `${image.library.url}reception/<goal>Reward.png`, the three prize levels with the
 * ranks `reward_user_limits` gives them, and the player's own rank under their head. Above it, the
 * prizes the player earned in finished goals with their redeem button. Without a goal or a prize
 * the slot shows its own texts.
 */
export const HotelViewCompetitionPrizesWidget: FC<{ fallback: ReactNode }> = ({ fallback }) => {
    const { goal = null } = useCommunityGoalProgress();
    const { prizes = [], redeeming = 0, redeem = null } = useCommunityGoalEarnedPrizes();
    const userData = useUserDataSnapshot();
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const hasGoal = !!goal?.goalCode;

    if (!hasGoal && !prizes.length) return <>{fallback}</>;

    const earned = prizes.length > 0 && redeem && <EarnedPrizesView prizes={prizes} redeeming={redeeming} redeem={redeem} />;

    if (!hasGoal) return <div className="hotelview-competition-prizes">{earned}</div>;

    const code = goal.goalCode;
    const goalText = (key: string, fallbackText: string, parameters: string[] = null, values: string[] = null) =>
        localizeWithFallback(prizesKey(`${code}.${key}`), fallbackText, parameters, values);
    const rank = goal.personalContributionRank;
    const rankKey = getPrizesUserRankKey(goal.hasGoalExpired, rank);
    const rankFallbacks = { yourfinalrank: 'Your final rank: %rank%', yourrank: 'Your current rank: %rank%', youarenotranked: 'You are not ranked' };

    return (
        <NativeTextTree>
            <div className="hotelview-competition-prizes">
                {earned}
                <h2>{goalText('caption', 'Competition prizes')}</h2>
                <p>{goalText('info', '')}</p>
                <div className="hotelview-competition-prizes-box">
                    <img
                        className="hotelview-competition-prizes-reward"
                        src={`${imageLibraryUrl}reception/${code}Reward.png`}
                        alt=""
                        draggable={false}
                        onError={(event) => {
                            event.currentTarget.style.visibility = 'hidden';
                        }}
                    />
                    <div className="hotelview-competition-prizes-reward-copy">
                        <strong>{goalText('rewardname', '')}</strong>
                        <p>{goalText('rewardinfo', '')}</p>
                        <div className="hotelview-competition-prizes-ranks">
                            {PRIZE_LEVELS.map((level) => {
                                const { start, end } = getPrizeRankLimits(level, goal.rewardUserLimits);
                                const single = start === end;

                                return (
                                    <div key={level} className="hotelview-competition-prizes-rank">
                                        <strong>{goalText(`rank${level}`, `#${level}`)}</strong>
                                        <span>
                                            {localizeWithFallback(prizesKey(single ? 'rank' : 'ranks'), single ? 'Rank %start%' : 'Ranks %start%-%end%', ['start', 'end'], [String(start), String(end)])}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {(!goal.hasGoalExpired || rank > 0) && (
                        <div className="hotelview-competition-prizes-user">
                            <LayoutAvatarImageView classNames={['hotelview-competition-prizes-head']} figure={userData?.figure || GetSessionDataManager()?.figure} headOnly direction={2} />
                            <div>
                                <strong>{localizeWithFallback(prizesKey(rankKey), rankFallbacks[rankKey], ['rank'], [String(rank)])}</strong>
                                {!goal.hasGoalExpired && (
                                    <p>
                                        {rank > 0
                                            ? goalText('yourrankinfo', 'You are almost there! Keep going!', ['points'], [String(goal.personalContributionScore)])
                                            : goalText('youarenotrankedinfo', 'Take part to get into the ranking.')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
