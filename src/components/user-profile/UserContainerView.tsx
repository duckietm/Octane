import { CreateLinkEvent, GetSessionDataManager, RelationshipStatusInfoMessageParser, RequestFriendComposer, UserProfileParser } from '@octane/renderer';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {
    ensureBadgeLeaderboardLoaded,
    formatProfileValue,
    FriendlyTime,
    getBadgesRank,
    isProfileHiddenFromViewer,
    LocalizeText,
    localizeWithFallback,
    profileAvatarPose,
    SanitizeHtml,
    SendMessageComposer
} from '../../api';
import { badgeEmblemDefault } from '../../assets/images/leaderboard_badge';
import { block as profileBlockIcon, level as profileLevelIcon, rooms as profileRoomsIcon } from '../../assets/images/user-profile';
import { LayoutBadgeImageView, Text, UserIdentityView } from '../../common';
import { ProfileAvatarFrameView } from './ProfileAvatarFrameView';
import { RelationshipsContainerView } from './RelationshipsContainerView';
import { BaseButton } from '../../common/BaseButton';
import { ToggleButton } from '../../common/ToggleButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';

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
    /** Opens the customiser of the own profile window (banner, background, border, accent). */
    onCustomize?: () => void;
    /** Phone layout: the banner, drawn as the top of the profile card. */
    banner?: ReactNode;
}

export const UserContainerView: FC<UserContainerViewProps> = (props) => {
    const { userProfile = null, userBadges = [], userRelationships = null, onOpenRooms = null, onClose = null, isBlocked = false, onToggleBlock = null, onCustomize = null, banner = null } = props;
    const borderId = userProfile.borderId ?? 0;
    const avatarPose = profileAvatarPose(userProfile);

    const [requestSent, setRequestSent] = useState(userProfile.requestSent);
    const isOwnProfile = userProfile.id === GetSessionDataManager().userId;
    // "Hide my profile": the server left the counts, last login and relationships out.
    const profileHidden = isProfileHiddenFromViewer(userProfile, GetSessionDataManager().userId);
    const canSendFriendRequest = !requestSent && !isOwnProfile && !userProfile.isMyFriend && !userProfile.requestSent;
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

    const addFriend = () => {
        setRequestSent(true);
        SendMessageComposer(new RequestFriendComposer(userProfile.username));
    };

    useEffect(() => {
        setRequestSent(userProfile.requestSent);
    }, [userProfile]);

    // Phone layout: the same profile as cards in the phone's own look (HandheldProfile.css).
    const isHandheld = useIsHandheld();

    if (isHandheld) {
        const blockLabel = isBlocked
            ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user')
            : localizeWithFallback('extendedprofile.block_player.title', 'Block user');
        const metaLabel = (key: string) => <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText(key).replace(/%\w+%/g, '').trim()) }} />;

        return (
            <NativeTextTree>
                <div className={`octane-handheld-profile__columns${isBlocked ? ' is-blocked' : ''}`}>
                    <div className="octane-handheld-profile__main">
                        <section className={`octane-handheld-profile__card is-hero${banner ? ' has-banner' : ''}`}>
                            {banner}
                            <div className="octane-handheld-profile__identity">
                                <div className="octane-handheld-profile__picture" data-testid="profile-picture">
                                    <ProfileAvatarFrameView
                                        figure={userProfile.figure}
                                        backgroundId={userProfile.backgroundId}
                                        standId={userProfile.standId}
                                        overlayId={userProfile.overlayId}
                                        borderId={borderId}
                                        direction={avatarPose.direction}
                                        offsetX={avatarPose.offsetX}
                                        offsetY={avatarPose.offsetY}
                                    />
                                </div>
                                <div className="octane-handheld-profile__copy">
                                    <UserIdentityView
                                        className="octane-handheld-profile__username"
                                        displayOrder={userProfile.displayOrder}
                                        nickIcon={userProfile.nickIcon}
                                        prefixColor={userProfile.prefixColor}
                                        prefixEffect={userProfile.prefixEffect}
                                        prefixFont={userProfile.prefixFont}
                                        prefixIcon={userProfile.prefixIcon}
                                        prefixText={userProfile.prefixText}
                                        username={userProfile.username}
                                    />
                                    <p className="octane-handheld-profile__motto">{userProfile.motto || '\u00A0'}</p>
                                    <p className="octane-handheld-profile__meta">
                                        {metaLabel('extendedprofile.created')} {userProfile.registration}
                                    </p>
                                    <p className="octane-handheld-profile__meta">
                                        {metaLabel('extendedprofile.last.login')}{' '}
                                        {formatProfileValue(userProfile.secondsSinceLastVisit, profileHidden, (seconds) => FriendlyTime.format(seconds, '.ago', 2))}
                                    </p>
                                    <p className="octane-handheld-profile__meta">
                                        <b>{LocalizeText('extendedprofile.achievementscore')}</b> {userProfile.achievementPoints}
                                    </p>
                                    <div className="octane-handheld-profile__status">
                                        <i className={`octane-icon ${userProfile.isOnline ? 'icon-pf-online' : 'icon-pf-offline'}`} />
                                        {!canSendFriendRequest && (
                                            <>
                                                <i className="octane-icon icon-pf-tick" />
                                                <span className="octane-handheld-profile__status-text">
                                                    {isOwnProfile && LocalizeText('extendedprofile.me')}
                                                    {userProfile.isMyFriend && LocalizeText('extendedprofile.friend')}
                                                    {(requestSent || userProfile.requestSent) && LocalizeText('extendedprofile.friendrequestsent')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="octane-handheld-profile__badges">
                                {[0, 1, 2, 3, 4].map((index) => (
                                    <BaseButton key={index} className="octane-handheld-profile__badge-slot">
                                        {selectedBadges[index] && <LayoutBadgeImageView badgeCode={selectedBadges[index]} highlightRarity showInfo showRarityInfo />}
                                    </BaseButton>
                                ))}
                            </div>
                            {isOwnProfile && (
                                <div className="octane-handheld-profile__actions">
                                    <BaseButton className="octane-handheld-profile__action" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                        {LocalizeText('extended.profile.change.looks')}
                                    </BaseButton>
                                    <BaseButton className="octane-handheld-profile__action" onClick={() => CreateLinkEvent('inventory/show/badges')}>
                                        {LocalizeText('extended.profile.change.badges')}
                                    </BaseButton>
                                    {onCustomize && (
                                        <BaseButton className="octane-handheld-profile__action is-wide" onClick={onCustomize}>
                                            {localizeWithFallback('extendedprofile.customize.title', 'Customise profile')}
                                        </BaseButton>
                                    )}
                                </div>
                            )}
                            {!isOwnProfile && (canSendFriendRequest || onToggleBlock) && (
                                <div className="octane-handheld-profile__actions">
                                    {canSendFriendRequest && (
                                        <BaseButton className="octane-handheld-profile__action is-primary" onClick={addFriend}>
                                            {LocalizeText('extendedprofile.addasafriend')}
                                        </BaseButton>
                                    )}
                                    {onToggleBlock && (
                                        <ToggleButton className={`octane-handheld-profile__action is-block${isBlocked ? ' is-active' : ''}`} pressed={isBlocked} onClick={onToggleBlock}>
                                            <img src={profileBlockIcon} alt="" draggable={false} />
                                            <span>{blockLabel}</span>
                                        </ToggleButton>
                                    )}
                                </div>
                            )}
                        </section>
                        <div className="octane-handheld-profile__cells">
                            <BaseButton className="octane-handheld-profile__cell" onClick={onOpenRooms}>
                                <img src={profileRoomsIcon} alt="" />
                                <span className="octane-handheld-profile__cell-label">{LocalizeText('extendedprofile.rooms')}</span>
                            </BaseButton>
                            <BaseButton className="octane-handheld-profile__cell" onClick={() => CreateLinkEvent('badge-leaderboard/show')}>
                                <img className="is-badge" src={badgeEmblemDefault} alt="" />
                                <span className="octane-handheld-profile__cell-label">{LocalizeText('inventory.badges')}</span>
                                <span className="octane-handheld-profile__cell-value">
                                    {totalBadges}
                                    {badgesRank > 0 ? ` (#${badgesRank})` : ''}
                                </span>
                            </BaseButton>
                            <BaseButton className="octane-handheld-profile__cell" onClick={() => CreateLinkEvent('achievements/toggle')}>
                                <img src={profileLevelIcon} alt="" />
                                <span className="octane-handheld-profile__cell-label">{LocalizeText('extendedprofile.achievementscore')}</span>
                                <span className="octane-handheld-profile__cell-value">{userProfile.achievementPoints}</span>
                            </BaseButton>
                        </div>
                    </div>
                    <section className="octane-handheld-profile__card is-friends">
                        <p
                            className="octane-handheld-profile__friends-count"
                            dangerouslySetInnerHTML={{
                                __html: SanitizeHtml(LocalizeText('extendedprofile.friends.count', ['count'], [formatProfileValue(userProfile.friendsCount, profileHidden)]))
                            }}
                        />
                        <p className="octane-handheld-profile__section-title">{LocalizeText('extendedprofile.relstatus')}</p>
                        {profileHidden && <p className="octane-handheld-profile__note">{localizeWithFallback('profile.full_profile_hidden', 'The full profile of this user is hidden')}</p>}
                        {!profileHidden && userRelationships && <RelationshipsContainerView relationships={userRelationships} onClose={onClose} />}
                        {!profileHidden && !userRelationships && <p className="octane-handheld-profile__note">{LocalizeText('generic.loading')}</p>}
                    </section>
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className={`octane-extended-profile${isBlocked ? ' is-blocked' : ''}`}>
                {!isOwnProfile && onToggleBlock && (
                    <Hint content={isBlocked ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user') : localizeWithFallback('extendedprofile.block_player.title', 'Block user')}><ToggleButton aria-label={isBlocked ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user') : localizeWithFallback('extendedprofile.block_player.title', 'Block user')}
                        type="button"
                        className={`octane-extended-profile__block-button${isBlocked ? ' is-active' : ''}`}
                        pressed={isBlocked}
                        onClick={onToggleBlock}
                    >
                        {/* The official extended_profile_block_icon, 16x16. */}
                        <img src={profileBlockIcon} alt="" draggable={false} />
                    </ToggleButton></Hint>
                )}
                <div className="octane-extended-profile__top">
                    <div className="octane-extended-profile__left">
                        <div className="octane-extended-profile__identity">
                            <ProfileAvatarFrameView
                                figure={userProfile.figure}
                                backgroundId={userProfile.backgroundId}
                                standId={userProfile.standId}
                                overlayId={userProfile.overlayId}
                                borderId={borderId}
                                direction={avatarPose.direction}
                                offsetX={avatarPose.offsetX}
                                offsetY={avatarPose.offsetY}
                            />
                            <div className="octane-extended-profile__identity-copy">
                                <UserIdentityView
                                    className="octane-extended-profile__username"
                                    displayOrder={userProfile.displayOrder}
                                    nickIcon={userProfile.nickIcon}
                                    prefixColor={userProfile.prefixColor}
                                    prefixEffect={userProfile.prefixEffect}
                                    prefixFont={userProfile.prefixFont}
                                    prefixIcon={userProfile.prefixIcon}
                                    prefixText={userProfile.prefixText}
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
                                    {formatProfileValue(userProfile.secondsSinceLastVisit, profileHidden, (seconds) => FriendlyTime.format(seconds, '.ago', 2))}
                                </p>
                                <p className="octane-extended-profile__meta octane-extended-profile__meta--strong">
                                    <b>{LocalizeText('extendedprofile.achievementscore')}</b> {userProfile.achievementPoints}
                                </p>
                                <div className="octane-extended-profile__status">
                                    <div className="octane-extended-profile__presence">
                                        <i className={`octane-icon ${userProfile.isOnline ? 'icon-pf-online' : 'icon-pf-offline'}`} />
                                    </div>
                                    <div className="octane-extended-profile__status-copy">
                                        {canSendFriendRequest && (
                                            <BaseButton className="octane-extended-profile__friend-button" type="button" onClick={addFriend}>
                                                {LocalizeText('extendedprofile.addasafriend')}
                                            </BaseButton>
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
                                <BaseButton className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                    {LocalizeText('extended.profile.change.looks')}
                                </BaseButton>
                                <BaseButton className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('inventory/show/badges')}>
                                    {LocalizeText('extended.profile.change.badges')}
                                </BaseButton>
                                {onCustomize && (
                                    <BaseButton className="octane-extended-profile__link" type="button" onClick={onCustomize}>
                                        {localizeWithFallback('extendedprofile.customize.title', 'Customise profile')}
                                    </BaseButton>
                                )}
                            </div>
                        )}

                        <div className="octane-extended-profile__badges">
                            {[0, 1, 2, 3, 4].map((index) => (
                                <BaseButton key={index} className="octane-extended-profile__badge-slot" type="button">
                                    {selectedBadges[index] && <LayoutBadgeImageView badgeCode={selectedBadges[index]} highlightRarity showInfo showRarityInfo />}
                                </BaseButton>
                            ))}
                        </div>
                    </div>

                    <div className="octane-extended-profile__separator" />

                    <div className="octane-extended-profile__right">
                        <p
                            className="text-sm leading-none"
                            dangerouslySetInnerHTML={{
                                __html: SanitizeHtml(LocalizeText('extendedprofile.friends.count', ['count'], [formatProfileValue(userProfile.friendsCount, profileHidden)]))
                            }}
                        />
                        <p className="octane-extended-profile__relationships-label">{LocalizeText('extendedprofile.relstatus')}</p>
                        {profileHidden && (
                            <Text small variant="muted">
                                {localizeWithFallback('profile.full_profile_hidden', 'The full profile of this user is hidden')}
                            </Text>
                        )}
                        {!profileHidden && userRelationships && <RelationshipsContainerView relationships={userRelationships} onClose={onClose} />}
                        {!profileHidden && !userRelationships && (
                            <Text small variant="muted">
                                {LocalizeText('generic.loading')}
                            </Text>
                        )}
                    </div>
                </div>

                <div className="octane-extended-profile__summary-bar">
                    <BaseButton className="octane-extended-profile__summary-button" type="button" onClick={onOpenRooms}>
                        <img className="octane-extended-profile__summary-icon" src={profileRoomsIcon} alt="" />
                        <span className="octane-extended-profile__summary-label">{LocalizeText('extendedprofile.rooms')}</span>
                    </BaseButton>
                    <BaseButton
                        className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center"
                        type="button"
                        onClick={() => CreateLinkEvent('badge-leaderboard/show')}
                    >
                        <img className="octane-extended-profile__summary-icon octane-extended-profile__summary-icon--badge" src={badgeEmblemDefault} alt="" />
                        <span className="octane-extended-profile__summary-label">{LocalizeText('inventory.badges')}</span>
                        <span className="octane-extended-profile__summary-value">{totalBadges}</span>
                        {badgesRank > 0 && <span className="octane-extended-profile__summary-rank">(#{badgesRank})</span>}
                    </BaseButton>
                    <BaseButton
                        className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center"
                        type="button"
                        onClick={() => CreateLinkEvent('achievements/toggle')}
                    >
                        <img className="octane-extended-profile__summary-icon" src={profileLevelIcon} alt="" />
                        <span className="octane-extended-profile__summary-label">{LocalizeText('extendedprofile.achievementscore')}</span>
                        <span className="octane-extended-profile__summary-value">{userProfile.achievementPoints}</span>
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
