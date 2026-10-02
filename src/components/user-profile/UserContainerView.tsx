import { CreateLinkEvent, GetSessionDataManager, RelationshipStatusInfoMessageParser, RequestFriendComposer, UserProfileParser } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { ensureBadgeLeaderboardLoaded, FriendlyTime, GetConfigurationValue, getBadgesRank, LocalizeText, localizeWithFallback, SanitizeHtml, SendMessageComposer } from '../../api';
import { badgeEmblemDefault } from '../../assets/images/leaderboard_badge';
import { block as profileBlockIcon, level as profileLevelIcon, rooms as profileRoomsIcon } from '../../assets/images/user-profile';
import { LayoutAvatarImageView, LayoutBadgeImageView, Text, UserIdentityView } from '../../common';
import { RelationshipsContainerView } from './RelationshipsContainerView';

interface UserContainerViewProps {
    userProfile: UserProfileParser;
    userBadges?: string[];
    userRelationships?: RelationshipStatusInfoMessageParser;
    onOpenRooms?: () => void;
    /** Closes the profile window (the official find-friends link closes it). */
    onClose?: () => void;
    /** Official block_button / blocked_container: the user is on the session block list. */
    isBlocked?: boolean;
    onToggleBlock?: () => void;
}

export const UserContainerView: FC<UserContainerViewProps> = (props) => {
    const { userProfile = null, userBadges = [], userRelationships = null, onOpenRooms = null, onClose = null, isBlocked = false, onToggleBlock = null } = props;

    const [requestSent, setRequestSent] = useState(userProfile.requestSent);
    const isOwnProfile = userProfile.id === GetSessionDataManager().userId;
    const canSendFriendRequest = !requestSent && !isOwnProfile && !userProfile.isMyFriend && !userProfile.requestSent;
    const infostandBackgroundClass = `background-${userProfile.backgroundId ?? 'default'}`;
    const infostandStandClass = `stand-${userProfile.standId ?? 'default'}`;
    const infostandOverlayClass = `overlay-${userProfile.overlayId ?? 'default'}`;
    const selectedBadges = useMemo(() => [...userBadges].slice(0, 5), [userBadges]);
    const totalBadges = (userProfile as any).totalBadges ?? userBadges.length ?? 0;

    // Official badgeRank "(#N)" next to the badge count, read from the badge leaderboard.
    const [badgesRank, setBadgesRank] = useState(-1);

    useEffect(() => {
        let cancelled = false;

        setBadgesRank(-1);

        ensureBadgeLeaderboardLoaded()
            .then((leaderboard) => {
                if (!cancelled) setBadgesRank(getBadgesRank(leaderboard, userProfile.id));
            })
            .catch(() => {
                if (!cancelled) setBadgesRank(-1);
            });

        return () => {
            cancelled = true;
        };
    }, [userProfile.id]);

    // Official presence: onlineStatus 1 online, 0 offline, 2 hidden (sent only to the user
    // themself). A server without the presence block leaves it at -1 and isOnline decides.
    const isHidden = userProfile.onlineStatus === 2;
    const isOnline = userProfile.onlineStatus === 1 || (userProfile.onlineStatus < 0 && userProfile.isOnline);
    // Official levelRegion: the account level; without it the achievement score stands in.
    const level = userProfile.level ?? 0;
    // Official user_activity_points is hidden unless activity.point.display.enabled.
    const showActivityPoints = GetConfigurationValue<boolean>('activity.point.display.enabled', false);

    const addFriend = () => {
        setRequestSent(true);
        SendMessageComposer(new RequestFriendComposer(userProfile.username));
    };

    useEffect(() => {
        setRequestSent(userProfile.requestSent);
    }, [userProfile]);

    return (
        <div className={`octane-extended-profile${isBlocked ? ' is-blocked' : ''}`}>
            {!isOwnProfile && onToggleBlock && (
                <button
                    type="button"
                    className={`octane-extended-profile__block-button${isBlocked ? ' is-active' : ''}`}
                    title={isBlocked ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user') : localizeWithFallback('extendedprofile.block_player.title', 'Block user')}
                    aria-pressed={isBlocked}
                    onClick={onToggleBlock}
                >
                    {/* The official extended_profile_block_icon, 16x16. */}
                    <img src={profileBlockIcon} alt="" draggable={false} />
                </button>
            )}
            <div className="octane-extended-profile__top">
                <div className="octane-extended-profile__left">
                    <div className="octane-extended-profile__identity">
                        <div className={`octane-extended-profile__avatar-shell profile-background ${infostandBackgroundClass}`}>
                            <div className={`octane-extended-profile__avatar-stand profile-stand ${infostandStandClass}`} />
                            <LayoutAvatarImageView figure={userProfile.figure} direction={2} classNames={['octane-extended-profile__avatar-image']} />
                            <div className={`octane-extended-profile__avatar-overlay profile-overlay ${infostandOverlayClass}`} />
                        </div>
                        <div className="octane-extended-profile__identity-copy">
                            <UserIdentityView
                                className="octane-extended-profile__username"
                                nickIcon={userProfile.nickIcon}
                                username={userProfile.username}
                            />
                            <p className="octane-extended-profile__motto">{userProfile.motto || '\u00A0'}</p>
                            <p className="octane-extended-profile__meta">
                                <span
                                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.created').replace(/%\w+%/g, '').trim()) }}
                                />{' '}
                                {userProfile.registration}
                            </p>
                            <p className="octane-extended-profile__meta">
                                <span
                                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.last.login').replace(/%\w+%/g, '').trim()) }}
                                />{' '}
                                {userProfile.secondsSinceLastVisit < 0 ? '-' : FriendlyTime.format(userProfile.secondsSinceLastVisit, '.ago', 2)}
                            </p>
                            {showActivityPoints && (
                                <p
                                    className="octane-extended-profile__meta"
                                    dangerouslySetInnerHTML={{
                                        __html: SanitizeHtml(LocalizeText('extendedprofile.activitypoints', ['activitypoints'], [userProfile.achievementPoints.toString()]))
                                    }}
                                />
                            )}
                            <div className="octane-extended-profile__status">
                                <div className="octane-extended-profile__presence">
                                    <i className={`octane-icon ${isOnline ? 'icon-pf-online' : 'icon-pf-offline'}${isHidden ? ' octane-extended-profile__presence--hidden' : ''}`} />
                                </div>
                                <div className="octane-extended-profile__status-copy">
                                    {canSendFriendRequest && (
                                        <button className="octane-extended-profile__friend-button" type="button" onClick={addFriend}>
                                            {LocalizeText('extendedprofile.addasafriend')}
                                        </button>
                                    )}
                                    {!canSendFriendRequest && (
                                        <>
                                            <i className="octane-icon icon-pf-tick" />
                                            <span className="octane-extended-profile__status-text">
                                                {isOwnProfile && LocalizeText('extendedprofile.me')}
                                                {userProfile.isMyFriend && LocalizeText('extendedprofile.friend')}
                                                {(requestSent || userProfile.requestSent) && LocalizeText('extendedprofile.friendrequestsent')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="octane-extended-profile__actions">
                            <button className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                {LocalizeText('extended.profile.change.looks')}
                            </button>
                            <button className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('inventory/show/badges')}>
                                {LocalizeText('extended.profile.change.badges')}
                            </button>
                        </div>
                    )}

                    <div className="octane-extended-profile__badges">
                        {[0, 1, 2, 3, 4].map((index) => (
                            <button key={index} className="octane-extended-profile__badge-slot" type="button">
                                {selectedBadges[index] && <LayoutBadgeImageView badgeCode={selectedBadges[index]} highlightRarity showInfo showRarityInfo />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="octane-extended-profile__separator" />

                <div className="octane-extended-profile__right">
                    <p
                        className="text-sm leading-none"
                        dangerouslySetInnerHTML={{
                            __html: SanitizeHtml(LocalizeText('extendedprofile.friends.count', ['count'], [userProfile.friendsCount.toString()]))
                        }}
                    />
                    <p className="octane-extended-profile__relationships-label">{LocalizeText('extendedprofile.relstatus')}</p>
                    {userRelationships && <RelationshipsContainerView relationships={userRelationships} onClose={onClose} />}
                    {!userRelationships && (
                        <Text small variant="muted">
                            {LocalizeText('generic.loading')}
                        </Text>
                    )}
                </div>
            </div>

            <div className="octane-extended-profile__summary-bar">
                <button className="octane-extended-profile__summary-button" type="button" onClick={onOpenRooms}>
                    <img className="octane-extended-profile__summary-icon" src={profileRoomsIcon} alt="" />
                    <span className="octane-extended-profile__summary-label">{LocalizeText('extendedprofile.rooms')}</span>
                </button>
                <button
                    className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center"
                    type="button"
                    onClick={() => CreateLinkEvent('badge-leaderboard/show')}
                >
                    <img className="octane-extended-profile__summary-icon octane-extended-profile__summary-icon--badge" src={badgeEmblemDefault} alt="" />
                    <span className="octane-extended-profile__summary-label">{LocalizeText('inventory.badges')}</span>
                    <span className="octane-extended-profile__summary-value">{totalBadges}</span>
                    {badgesRank > 0 && <span className="octane-extended-profile__summary-rank">(#{badgesRank})</span>}
                </button>
                {/* Official levelRegion: "Level N", no click and no tooltip. */}
                <div className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center octane-extended-profile__summary-button--level">
                    <img className="octane-extended-profile__summary-icon" src={profileLevelIcon} alt="" />
                    <span className="octane-extended-profile__summary-label">{level > 0 ? LocalizeText('generic.level') : LocalizeText('extendedprofile.achievementscore')}</span>
                    <span className="octane-extended-profile__summary-value">{level > 0 ? level : userProfile.achievementPoints}</span>
                </div>
            </div>
        </div>
    );
};
