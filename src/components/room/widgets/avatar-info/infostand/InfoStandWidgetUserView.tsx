import {
    GetSessionDataManager,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomSessionFavoriteGroupUpdateEvent,
    RoomSessionUserBadgesEvent,
    RoomSessionUserFigureUpdateEvent,
    UserRelationshipsComposer
} from '@octane/renderer';
import React, { Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useCallback, useEffect, useState } from 'react';
import { AvatarInfoUser, CloneObject, GetConfigurationValue, GetGroupInformation, GetUserProfile, LocalizeText, SendMessageComposer } from '../../../../../api';
import homeIcon from '../../../../../assets/images/infostand/home-icon.png';
import pencilIcon from '../../../../../assets/images/infostand/pencil-icon.png';
import { Base, Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserIdentityView } from '../../../../../common';
import { useMessageEvent, useOctaneEvent, useRoom } from '../../../../../hooks';
import { BackgroundsView } from '../../../../backgrounds/BackgroundsView';
import { InfoStandBadgeSlotView } from './InfoStandBadgeSlotView';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';

interface InfoStandWidgetUserViewProps {
    avatarInfo: AvatarInfoUser;
    setAvatarInfo: Dispatch<SetStateAction<AvatarInfoUser>>;
    onClose: () => void;
}

export const InfoStandWidgetUserView: FC<InfoStandWidgetUserViewProps> = (props) => {
    const { avatarInfo = null, setAvatarInfo = null, onClose = null } = props;
    const [motto, setMotto] = useState<string>(null);
    const [isEditingMotto, setIsEditingMotto] = useState(false);
    const [relationships, setRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    const [backgroundId, setBackgroundId] = useState<number>(null);
    const [standId, setStandId] = useState<number>(null);
    const [overlayId, setOverlayId] = useState<number>(null);
    const [cardBackgroundId, setCardBackgroundId] = useState<number>(null);
    const [borderId, setBorderId] = useState<number>(null);
    const [isVisible, setIsVisible] = useState(false);
    const { roomSession = null } = useRoom();

    const infostandBackgroundClass = `background-${backgroundId ?? 'default'}`;
    const infostandStandClass = `stand-${standId ?? 'default'}`;
    const infostandOverlayClass = `overlay-${overlayId ?? 'default'}`;
    const infostandCardBackgroundClass = cardBackgroundId ? `card-background-${cardBackgroundId}` : '';
    const infostandBorderClass = borderId ? `border-${borderId}` : '';
    const handleProfileClick = useCallback(() => {
        GetUserProfile(avatarInfo.webID);
    }, [avatarInfo.webID]);

    const handleEditClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        setIsVisible((prev) => !prev);
    }, []);

    const saveMotto = (motto: string) => {
        if (!isEditingMotto || motto.length > GetConfigurationValue<number>('motto.max.length', 38) || !roomSession) return;

        roomSession.sendMottoMessage(motto);
        setIsEditingMotto(false);
    };

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);

    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();

        switch (event.key) {
            case 'Enter':
                saveMotto((event.target as HTMLInputElement).value);
                return;
        }
    };

    useOctaneEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, (event) => {
        if (!avatarInfo || avatarInfo.webID !== event.userId) return;

        // Deduplicate badges from server
        const seen = new Set<string>();
        const dedupedBadges = event.badges.map((code) => {
            if (!code || seen.has(code)) return '';
            seen.add(code);
            return code;
        });

        const oldBadges = avatarInfo.badges.join('');

        if (oldBadges === dedupedBadges.join('')) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.badges = dedupedBadges;
            return newValue;
        });
    });

    useOctaneEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.figure = event.figure;
            newValue.motto = event.customInfo;
            newValue.achievementScore = event.activityPoints;
            newValue.nickIcon = event.nickIcon;
            newValue.prefixText = event.prefixText;
            newValue.prefixColor = event.prefixColor;
            newValue.prefixIcon = event.prefixIcon;
            newValue.prefixEffect = event.prefixEffect;
            newValue.displayOrder = event.displayOrder;
            newValue.backgroundId = event.backgroundId;
            newValue.standId = event.standId;
            newValue.overlayId = event.overlayId;
            newValue.cardBackgroundId = event.cardBackgroundId ?? 0;
            newValue.borderId = event.borderId ?? 0;
            return newValue;
        });
    });

    useOctaneEvent<RoomSessionFavoriteGroupUpdateEvent>(RoomSessionFavoriteGroupUpdateEvent.FAVOURITE_GROUP_UPDATE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            const clearGroup = event.status === -1 || event.habboGroupId <= 0;

            newValue.groupId = clearGroup ? -1 : event.habboGroupId;
            newValue.groupName = clearGroup ? null : event.habboGroupName;
            newValue.groupBadgeId = clearGroup ? null : GetSessionDataManager().getGroupBadge(event.habboGroupId);
            return newValue;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!avatarInfo || avatarInfo.webID !== parser.userId) return;

        setRelationships(parser);
    });

    useEffect(() => {
        setIsEditingMotto(false);
        setMotto(avatarInfo.motto);
        setBackgroundId(avatarInfo.backgroundId);
        setStandId(avatarInfo.standId);
        setOverlayId(avatarInfo.overlayId);
        setCardBackgroundId(avatarInfo.cardBackgroundId ?? 0);
        setBorderId(avatarInfo.borderId ?? 0);

        SendMessageComposer(new UserRelationshipsComposer(avatarInfo.webID));

        return () => {
            setRelationships(null);
        };
    }, [avatarInfo]);

    if (!avatarInfo) return null;

    const isOwnUser = avatarInfo.type === AvatarInfoUser.OWN_USER;
    const showAchievementScore = GetConfigurationValue<boolean>('activity.point.display.enabled', true);
    const hasRelationships = !!relationships?.relationshipStatusMap.length;

    return (
        <>
            <div className={`octane-infostand pointer-events-auto z-30 profile-card-background ${infostandCardBackgroundClass}`}>
                {borderId ? <Base className={`infostand-border ${infostandBorderClass}`} /> : null}
                <button type="button" className="octane-infostand__close" aria-label="Close" onClick={onClose} />
                <div className="octane-infostand__header">
                    <button
                        type="button"
                        className="octane-infostand__home"
                        aria-label={LocalizeText('infostand.profile.link.tooltip')}
                        onClick={handleProfileClick}
                    >
                        <img src={homeIcon} alt="" draggable={false} />
                    </button>
                    <button type="button" className="octane-infostand__profile-link" onClick={handleProfileClick}>
                        <UserIdentityView
                            className="octane-infostand__identity"
                            displayOrder={avatarInfo.displayOrder}
                            nameClassName="text-white"
                            nickIcon={avatarInfo.nickIcon}
                            prefixColor={avatarInfo.prefixColor}
                            prefixEffect={avatarInfo.prefixEffect}
                            prefixFont={avatarInfo.prefixFont}
                            prefixIcon={avatarInfo.prefixIcon}
                            prefixText={avatarInfo.prefixText}
                            username={avatarInfo.name}
                        />
                    </button>
                </div>
                <div className="octane-infostand__rule" />
                <div className="octane-infostand__figure-row">
                    <div className={`octane-infostand__avatar-well profile-background ${infostandBackgroundClass}`} onClick={handleProfileClick}>
                        <Base position="absolute" className={`profile-stand ${infostandStandClass}`} />
                        <LayoutAvatarImageView direction={2} figure={avatarInfo.figure} />
                        <Base position="absolute" className={`profile-overlay ${infostandOverlayClass}`} />
                    </div>
                    {avatarInfo.type === AvatarInfoUser.OWN_USER && (
                        <Base
                            className="background-edit-icon background-edit-position"
                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            onClick={handleEditClick}
                            aria-label="Edit profile background"
                        />
                    )}
                    <div className="octane-infostand__badges">
                        {(() => {
                            const maxSlots = GetConfigurationValue<number>('user.badges.max.slots', 5);
                            const showGroup = maxSlots <= 5;
                            const items: React.ReactNode[] = [];
                            items.push(<InfoStandBadgeSlotView key={0} slotIndex={0} badgeCode={avatarInfo.badges[0]} isOwnUser={isOwnUser} />);
                            if (showGroup) {
                                items.push(
                                    <Flex
                                        key="group"
                                        center
                                        className="relative h-[42px] w-[42px] bg-no-repeat bg-center"
                                        pointer={avatarInfo.groupId > 0}
                                        onClick={() => GetGroupInformation(avatarInfo.groupId)}
                                    >
                                        {avatarInfo.groupId > 0 && (
                                            <LayoutBadgeImageView
                                                badgeCode={avatarInfo.groupBadgeId}
                                                customTitle={avatarInfo.groupName}
                                                isGroup={true}
                                                showInfo={true}
                                            />
                                        )}
                                    </Flex>
                                );
                            } else {
                                items.push(<InfoStandBadgeSlotView key="slot1" slotIndex={1} badgeCode={avatarInfo.badges[1]} isOwnUser={isOwnUser} />);
                            }
                            const startIdx = showGroup ? 1 : 2;
                            for (let i = startIdx; i < maxSlots; i++) {
                                items.push(<InfoStandBadgeSlotView key={i} slotIndex={i} badgeCode={avatarInfo.badges[i]} isOwnUser={isOwnUser} />);
                            }
                            return items;
                        })()}
                    </div>
                </div>
                <div className="octane-infostand__rule" />
                <div className="octane-infostand__motto">
                    {isOwnUser && <img src={pencilIcon} alt="" className="octane-infostand__pen" />}
                    {!isOwnUser && (
                        <Text fullWidth pointer textBreak wrap className="octane-infostand__motto-text" variant="white">
                            {motto}
                        </Text>
                    )}
                    {isOwnUser && !isEditingMotto && (
                        <Text
                            fullWidth
                            pointer
                            textBreak
                            wrap
                            className={`octane-infostand__motto-text ${motto ? '' : 'is-placeholder'}`}
                            variant="white"
                            onClick={() => setIsEditingMotto(true)}
                        >
                            {motto || LocalizeText('infostand.motto.change')} 
                        </Text>
                    )}
                    {isOwnUser && isEditingMotto && (
                        <input
                            autoFocus={true}
                            className="motto-input"
                            maxLength={GetConfigurationValue<number>('motto.max.length', 38)}
                            type="text"
                            value={motto}
                            onBlur={onMottoBlur}
                            onChange={(event) => setMotto(event.target.value)}
                            onKeyDown={onMottoKeyDown}
                        />
                    )}
                </div>
                {showAchievementScore && (
                    <>
                        <div className="octane-infostand__rule" />
                        <div className="octane-infostand__score">
                            <span>{LocalizeText('infostand.text.achievement_score')}</span>
                            <span>{avatarInfo.achievementScore}</span>
                        </div>
                    </>
                )}
                {avatarInfo.carryItem > 0 && (
                    <>
                        <div className="octane-infostand__rule" />
                        <Text small wrap variant="white">
                            {LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}
                        </Text>
                    </>
                )}
                <div className={`octane-infostand__rule ${hasRelationships ? '' : 'octane-infostand__rule--footer'}`} />
                <InfoStandWidgetUserRelationshipsView relationships={relationships} />
                {GetConfigurationValue('user.tags.enabled') && (
                    <Column className="mt-1" gap={1}>
                        <InfoStandWidgetUserTagsView tags={GetSessionDataManager().tags} />
                    </Column>
                )}
            </div>
            {isVisible && avatarInfo.type === AvatarInfoUser.OWN_USER && (
                <div className="backgrounds-view-container">
                    <BackgroundsView
                        setIsVisible={setIsVisible}
                        selectedBackground={backgroundId}
                        setSelectedBackground={setBackgroundId}
                        selectedStand={standId}
                        setSelectedStand={setStandId}
                        selectedOverlay={overlayId}
                        setSelectedOverlay={setOverlayId}
                        selectedCardBackground={cardBackgroundId}
                        setSelectedCardBackground={setCardBackgroundId}
                        selectedBorder={borderId}
                        setSelectedBorder={setBorderId}
                    />
                </div>
            )}
        </>
    );
};
