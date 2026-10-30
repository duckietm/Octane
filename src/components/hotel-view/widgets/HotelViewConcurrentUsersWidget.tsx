import { FC, ReactNode } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { CONCURRENT_USERS_DISABLED, getConcurrentUsersView } from '../../../api/hotel-view/LandingViewWidgets';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useConcurrentUsersGoal } from '../../../hooks';

/**
 * The users-online goal (element_concurrentusersinfo.xml + the caption/bodytext elements around it):
 * "<count> of <goal> online", then the badge and the claim button once the hotel reached the goal.
 * The badge image is `${image.library.url}album1584/<badge>.png`, the badge code from the slot
 * config (`badgeCode`, ConcurrentUsersReward by default) as the official element takes it from its
 * configuration.
 */
export const HotelViewConcurrentUsersWidget: FC<{ fallback: ReactNode; badgeCode: string }> = ({ fallback, badgeCode }) => {
    const { state = -1, userCount = -1, userCountGoal = -1, claiming = false, claimReward = null } = useConcurrentUsersGoal();
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    if (state < 0 || state === CONCURRENT_USERS_DISABLED) return <>{fallback}</>;

    const view = getConcurrentUsersView(state);
    const domain = localizeWithFallback('landing.view.hotel.domain', 'Habbo');
    const parameters = ['userCount', 'userGoal', 'domain'];
    const values = [String(userCount), String(userCountGoal), domain];

    return (
        <NativeTextTree>
            <div className={`hotelview-concurrent-users${view.achieved ? ' hotelview-concurrent-users-achieved' : ''}`}>
                <span className="hotelview-widget-title">{localizeWithFallback('landing.view.concurrentusers.title', 'Habbo Challenge')}</span>
                <h2>{localizeWithFallback(view.captionKey, view.achieved ? 'We did it!' : 'Break the record!')}</h2>
                <p>
                    {localizeWithFallback(
                        view.bodyKey,
                        view.achieved ? 'We reached the goal: enough users were online at the same time!' : 'Get %userGoal% users online at the same time!',
                        parameters,
                        values
                    )}
                </p>
                {!view.achieved && (
                    <strong className="hotelview-concurrent-users-info">
                        {localizeWithFallback('landing.view.concurrentusers.info', 'Users online: %userCount% of %userGoal%', parameters, values)}
                    </strong>
                )}
                {view.achieved && (
                    <div className="hotelview-concurrent-users-reward">
                        <img src={`${imageLibraryUrl}album1584/${badgeCode || 'ConcurrentUsersReward'}.png`} alt="" draggable={false} />
                        <span>{localizeWithFallback('landing.view.concurrentusers.reward', 'Your reward: a badge')}</span>
                    </div>
                )}
                {view.showRedeemButton && (
                    <BaseButton type="button" className="hotelview-widget-button" disabled={claiming} onClick={() => claimReward && claimReward()}>
                        {localizeWithFallback('landing.view.concurrentusers.redeem', 'Claim reward')}
                    </BaseButton>
                )}
            </div>
        </NativeTextTree>
    );
};
