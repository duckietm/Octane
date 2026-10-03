import {
    CreateLinkEvent,
    FlatControllerAddedEvent,
    FlatControllerRemovedEvent,
    GetSessionDataManager,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomUnitGiveHandItemComposer,
    SetRelationshipStatusComposer,
    TradingOpenComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
    AMBASSADOR_MUTE_MINUTES,
    AvatarInfoUser,
    canReplenishRespect,
    DispatchUiEvent,
    GetConfigurationValue,
    GetOwnRoomObject,
    GetUserProfile,
    isHousekeepingEnabled,
    getMuteLabelKey,
    getTradeBlockedKey,
    LocalizeText,
    MessengerFriend,
    NotificationAlertType,
    ReportType,
    RoomWidgetUpdateChatInputContentEvent,
    SanitizeHtml,
    SendMessageComposer
} from '../../../../../api';
import { Flex } from '../../../../../common';
import { useFriends, useHasPermission, useHelp, useIsUserIgnored, useMessageEvent, useNotification, usePurse, useRoom, useSessionInfo, useWiredTools } from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetAvatarViewProps {
    avatarInfo: AvatarInfoUser;
    onClose: () => void;
}

const MODE_NORMAL = 0;
const MODE_MODERATE = 1;
const MODE_MODERATE_BAN = 2;
const MODE_MODERATE_MUTE = 3;
const MODE_AMBASSADOR = 4;
const MODE_AMBASSADOR_MUTE = 5;
const MODE_RELATIONSHIP = 6;

const DUCKETS = 0;

export const AvatarInfoWidgetAvatarView: FC<AvatarInfoWidgetAvatarViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;
    const [mode, setMode] = useState(MODE_NORMAL);
    const { canRequestFriend = null } = useFriends();
    const { report = null } = useHelp();
    const { roomSession = null, isHandItemBlocked = false } = useRoom();
    const { userRespectRemaining = 0, respectReplenishesLeft = 0, respectUser = null, replenishRespect = null } = useSessionInfo();
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const { getCurrencyAmount = null } = usePurse();
    const { openInspectionForUser, showInspectButton } = useWiredTools();
    const canOpenHousekeeping = useHasPermission('acc_housekeeping') && isHousekeepingEnabled();
    // Reactive: the menu auto-flips Ignore <-> Unignore if the state
    // changes while the popup is open. Direct snapshot hook call
    // scope here) so useSyncExternalStore installs against the real
    // React dispatcher.
    const isIgnored = useIsUserIgnored(avatarInfo.name);
    // Reactive controller level: starts from the cached value at popup
    // open time, then updates from FlatControllerAdded/Removed events
    // and from optimistic clicks so the Give/Remove Rights buttons flip
    // instantly without waiting for a server roundtrip.
    const [controllerLevel, setControllerLevel] = useState(avatarInfo.targetRoomControllerLevel);

    useMessageEvent<FlatControllerAddedEvent>(FlatControllerAddedEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.data.userId !== avatarInfo.webID) return;

        setControllerLevel(RoomControllerLevel.GUEST);
    });

    useMessageEvent<FlatControllerRemovedEvent>(FlatControllerRemovedEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.userId !== avatarInfo.webID) return;

        setControllerLevel(RoomControllerLevel.NONE);
    });

    const isShowGiveRights = useMemo(() => {
        return avatarInfo.amIOwner && controllerLevel < RoomControllerLevel.GUEST && !avatarInfo.isGuildRoom;
    }, [avatarInfo, controllerLevel]);

    const isShowRemoveRights = useMemo(() => {
        return avatarInfo.amIOwner && controllerLevel === RoomControllerLevel.GUEST && !avatarInfo.isGuildRoom;
    }, [avatarInfo, controllerLevel]);

    const moderateMenuHasContent = useMemo(() => {
        return avatarInfo.canBeKicked || avatarInfo.canBeBanned || avatarInfo.canBeMuted || isShowGiveRights || isShowRemoveRights;
    }, [isShowGiveRights, isShowRemoveRights, avatarInfo]);

    const canGiveHandItem = useMemo(() => {
        if (isHandItemBlocked) return false;

        let flag = false;

        const roomObject = GetOwnRoomObject();

        if (roomObject) {
            const carryId = roomObject.model.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT);

            if (carryId > 0 && carryId < 999999) flag = true;
        }

        return flag;
    }, [isHandItemBlocked]);

    const tradeBlockedKey = getTradeBlockedKey(avatarInfo.canTrade, avatarInfo.canTradeReason);

    // Flash asks first: the replenish costs duckets and works once a day.
    const askReplenishRespect = () => {
        const cost = GetConfigurationValue<number>('respect.replenish_cost_duckets', 50);

        if (cost > 0 && getCurrencyAmount(DUCKETS) < cost) {
            simpleAlert(
                LocalizeText('respect.replenish.not_enough_duckets.desc', ['amount'], [cost.toString()]),
                NotificationAlertType.DEFAULT,
                null,
                null,
                LocalizeText('respect.replenish.not_enough_duckets.title')
            );
            return;
        }

        showConfirm(
            LocalizeText('respect.replenish.desc', ['amount'], [cost.toString()]),
            () => replenishRespect(),
            null,
            null,
            null,
            LocalizeText('respect.replenish.title')
        );
    };

    const processAction = (name: string) => {
        let hideMenu = true;

        if (name) {
            switch (name) {
                case 'moderate':
                    hideMenu = false;
                    setMode(MODE_MODERATE);
                    break;
                case 'ban':
                    hideMenu = false;
                    setMode(MODE_MODERATE_BAN);
                    break;
                case 'mute':
                    hideMenu = false;
                    setMode(MODE_MODERATE_MUTE);
                    break;
                case 'ambassador':
                    hideMenu = false;
                    setMode(MODE_AMBASSADOR);
                    break;
                case 'ambassador_mute':
                    hideMenu = false;
                    setMode(MODE_AMBASSADOR_MUTE);
                    break;
                case 'back_moderate':
                    hideMenu = false;
                    setMode(MODE_MODERATE);
                    break;
                case 'back_ambassador':
                    hideMenu = false;
                    setMode(MODE_AMBASSADOR);
                    break;
                case 'back':
                    hideMenu = false;
                    setMode(MODE_NORMAL);
                    break;
                case 'whisper':
                    DispatchUiEvent(new RoomWidgetUpdateChatInputContentEvent(RoomWidgetUpdateChatInputContentEvent.WHISPER, avatarInfo.name));
                    break;
                case 'friend':
                    CreateLinkEvent(`friends/request/${avatarInfo.webID}/${avatarInfo.name}`);
                    break;
                case 'relationship':
                    hideMenu = false;
                    setMode(MODE_RELATIONSHIP);
                    break;
                case 'replenish_respect':
                    askReplenishRespect();
                    break;
                case 'respect': {
                    respectUser(avatarInfo.webID);

                    if (userRespectRemaining - 1 >= 1) hideMenu = false;
                    break;
                }
                case 'ignore':
                    GetSessionDataManager().ignoreUser(avatarInfo.name);
                    break;
                case 'unignore':
                    GetSessionDataManager().unignoreUser(avatarInfo.name);
                    break;
                case 'kick':
                    roomSession.sendKickMessage(avatarInfo.webID);
                    break;
                case 'ban_hour':
                    roomSession.sendBanMessage(avatarInfo.webID, 'RWUAM_BAN_USER_HOUR');
                    break;
                case 'ban_day':
                    roomSession.sendBanMessage(avatarInfo.webID, 'RWUAM_BAN_USER_DAY');
                    break;
                case 'perm_ban':
                    roomSession.sendBanMessage(avatarInfo.webID, 'RWUAM_BAN_USER_PERM');
                    break;
                case 'mute_2min':
                    roomSession.sendMuteMessage(avatarInfo.webID, 2);
                    break;
                case 'mute_5min':
                    roomSession.sendMuteMessage(avatarInfo.webID, 5);
                    break;
                case 'mute_10min':
                    roomSession.sendMuteMessage(avatarInfo.webID, 10);
                    break;
                case 'give_rights':
                    roomSession.sendGiveRightsMessage(avatarInfo.webID);
                    setControllerLevel(RoomControllerLevel.GUEST);
                    hideMenu = false;
                    setMode(MODE_MODERATE);
                    break;
                case 'remove_rights':
                    roomSession.sendTakeRightsMessage(avatarInfo.webID);
                    setControllerLevel(RoomControllerLevel.NONE);
                    hideMenu = false;
                    setMode(MODE_MODERATE);
                    break;
                case 'trade':
                    if (tradeBlockedKey) {
                        hideMenu = false;
                        break;
                    }

                    SendMessageComposer(new TradingOpenComposer(avatarInfo.roomIndex));
                    break;
                case 'report':
                    report(ReportType.BULLY, { reportedUserId: avatarInfo.webID });
                    break;
                case 'housekeeping':
                    CreateLinkEvent(`housekeeping/user/${avatarInfo.webID}/${encodeURIComponent(avatarInfo.name)}/${encodeURIComponent(avatarInfo.figure)}`);
                    break;
                case 'inspect':
                    openInspectionForUser(avatarInfo.roomIndex);
                    break;
                case 'pass_hand_item':
                    SendMessageComposer(new RoomUnitGiveHandItemComposer(avatarInfo.webID));
                    break;
                case 'ambassador_alert':
                    roomSession.sendAmbassadorAlertMessage(avatarInfo.webID);
                    break;
                case 'ambassador_kick':
                    roomSession.sendKickMessage(avatarInfo.webID);
                    break;
                case 'ambassador_unmute':
                    roomSession.sendUnmuteMessage(avatarInfo.webID);
                    break;
                case 'rship_heart':
                    SendMessageComposer(new SetRelationshipStatusComposer(avatarInfo.webID, MessengerFriend.RELATIONSHIP_HEART));
                    break;
                case 'rship_smile':
                    SendMessageComposer(new SetRelationshipStatusComposer(avatarInfo.webID, MessengerFriend.RELATIONSHIP_SMILE));
                    break;
                case 'rship_bobba':
                    SendMessageComposer(new SetRelationshipStatusComposer(avatarInfo.webID, MessengerFriend.RELATIONSHIP_BOBBA));
                    break;
                case 'rship_none':
                    SendMessageComposer(new SetRelationshipStatusComposer(avatarInfo.webID, MessengerFriend.RELATIONSHIP_NONE));
                    break;
                default:
                    if (name.startsWith('ambassador_mute_')) {
                        const minutes = Number(name.substring('ambassador_mute_'.length));

                        if (AMBASSADOR_MUTE_MINUTES.includes(minutes)) roomSession.sendMuteMessage(avatarInfo.webID, minutes);
                    }
                    break;
            }
        }

        if (hideMenu) onClose();
    };

    useEffect(() => {
        setMode(MODE_NORMAL);
        setControllerLevel(avatarInfo.targetRoomControllerLevel);
    }, [avatarInfo]);

    return (
        <ContextMenuView
            category={RoomObjectCategory.UNIT}
            classNames={['octane-avatar-action-menu']}
            collapsable={true}
            objectId={avatarInfo.roomIndex}
            userType={avatarInfo.userType}
            onClose={onClose}
        >
            <ContextMenuHeaderView
                className="cursor-pointer"
                onClick={(event) => GetUserProfile(avatarInfo.webID)}
                dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${avatarInfo.name}`) }}
            ></ContextMenuHeaderView>
            {mode === MODE_NORMAL && (
                <>
                    {canRequestFriend(avatarInfo.webID) && (
                        <ContextMenuListItemView onClick={(event) => processAction('friend')}>
                            {LocalizeText('infostand.button.friend')}
                        </ContextMenuListItemView>
                    )}
                    <ContextMenuListItemView
                        disabled={!!tradeBlockedKey}
                        title={tradeBlockedKey ? LocalizeText(tradeBlockedKey) : undefined}
                        onClick={(event) => processAction('trade')}
                    >
                        {LocalizeText('infostand.button.trade')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('whisper')}>{LocalizeText('infostand.button.whisper')}</ContextMenuListItemView>
                    {userRespectRemaining > 0 && (
                        <ContextMenuListItemView onClick={(event) => processAction('respect')}>
                            {LocalizeText('infostand.button.respect', ['count'], [userRespectRemaining.toString()])}
                        </ContextMenuListItemView>
                    )}
                    {canReplenishRespect(userRespectRemaining, respectReplenishesLeft) && (
                        <ContextMenuListItemView onClick={(event) => processAction('replenish_respect')}>
                            {LocalizeText('infostand.button.replenish_respect')}
                        </ContextMenuListItemView>
                    )}
                    {!canRequestFriend(avatarInfo.webID) && (
                        <ContextMenuListItemView onClick={(event) => processAction('relationship')}>
                            {LocalizeText('infostand.link.relationship')}
                            <FaChevronRight className="right fa-icon" />
                        </ContextMenuListItemView>
                    )}
                    {!isIgnored && (
                        <ContextMenuListItemView onClick={(event) => processAction('ignore')}>
                            {LocalizeText('infostand.button.ignore')}
                        </ContextMenuListItemView>
                    )}
                    {isIgnored && (
                        <ContextMenuListItemView onClick={(event) => processAction('unignore')}>
                            {LocalizeText('infostand.button.unignore')}
                        </ContextMenuListItemView>
                    )}
                    <ContextMenuListItemView onClick={(event) => processAction('report')}>{LocalizeText('infostand.button.report')}</ContextMenuListItemView>
                    {showInspectButton && <ContextMenuListItemView onClick={(event) => processAction('inspect')}>Inspect</ContextMenuListItemView>}
                    {moderateMenuHasContent && (
                        <ContextMenuListItemView onClick={(event) => processAction('moderate')}>
                            <FaChevronRight className="right fa-icon" />
                            {LocalizeText('infostand.link.moderate')}
                        </ContextMenuListItemView>
                    )}
                    {canOpenHousekeeping && (
                        <ContextMenuListItemView onClick={(event) => processAction('housekeeping')}>
                            {LocalizeText('housekeeping.menu.open_user')}
                        </ContextMenuListItemView>
                    )}
                    {avatarInfo.isAmbassador && (
                        <ContextMenuListItemView onClick={(event) => processAction('ambassador')}>
                            <FaChevronRight className="right fa-icon" />
                            {LocalizeText('infostand.link.ambassador')}
                        </ContextMenuListItemView>
                    )}
                    {canGiveHandItem && (
                        <ContextMenuListItemView onClick={(event) => processAction('pass_hand_item')}>
                            {LocalizeText('avatar.widget.pass_hand_item')}
                        </ContextMenuListItemView>
                    )}
                </>
            )}
            {mode === MODE_MODERATE && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('kick')}>{LocalizeText('infostand.button.kick')}</ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('mute')}>
                        <FaChevronRight className="right fa-icon" />
                        {LocalizeText('infostand.button.mute')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('ban')}>
                        <FaChevronRight className="right fa-icon" />
                        {LocalizeText('infostand.button.ban')}
                    </ContextMenuListItemView>
                    {isShowGiveRights && (
                        <ContextMenuListItemView onClick={(event) => processAction('give_rights')}>
                            {LocalizeText('infostand.button.giverights')}
                        </ContextMenuListItemView>
                    )}
                    {isShowRemoveRights && (
                        <ContextMenuListItemView onClick={(event) => processAction('remove_rights')}>
                            {LocalizeText('infostand.button.removerights')}
                        </ContextMenuListItemView>
                    )}
                    <ContextMenuListItemView onClick={(event) => processAction('back')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_MODERATE_BAN && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('ban_hour')}>
                        {LocalizeText('infostand.button.ban_hour')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('ban_day')}>{LocalizeText('infostand.button.ban_day')}</ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('perm_ban')}>
                        {LocalizeText('infostand.button.perm_ban')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('back_moderate')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_MODERATE_MUTE && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('mute_2min')}>
                        {LocalizeText('infostand.button.mute_2min')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('mute_5min')}>
                        {LocalizeText('infostand.button.mute_5min')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('mute_10min')}>
                        {LocalizeText('infostand.button.mute_10min')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('back_moderate')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_AMBASSADOR && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('ambassador_alert')}>
                        {LocalizeText('infostand.button.alert')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('ambassador_kick')}>
                        {LocalizeText('infostand.button.kick')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('ambassador_mute')}>
                        {LocalizeText('infostand.button.mute')}
                        <FaChevronRight className="right fa-icon" />
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('ambassador_unmute')}>
                        {LocalizeText('infostand.button.unmute')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('back')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_AMBASSADOR_MUTE && (
                <>
                    {AMBASSADOR_MUTE_MINUTES.map((minutes) => (
                        <ContextMenuListItemView key={minutes} onClick={(event) => processAction(`ambassador_mute_${minutes}`)}>
                            {LocalizeText(getMuteLabelKey(minutes))}
                        </ContextMenuListItemView>
                    ))}
                    <ContextMenuListItemView onClick={(event) => processAction('back_ambassador')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_RELATIONSHIP && (
                <>
                    <Flex className="menu-list-split-3">
                        <ContextMenuListItemView onClick={(event) => processAction('rship_heart')}>
                            <div className="octane-friends-spritesheet icon-heart cursor-pointer" />
                        </ContextMenuListItemView>
                        <ContextMenuListItemView onClick={(event) => processAction('rship_smile')}>
                            <div className="octane-friends-spritesheet icon-smile cursor-pointer" />
                        </ContextMenuListItemView>
                        <ContextMenuListItemView onClick={(event) => processAction('rship_bobba')}>
                            <div className="octane-friends-spritesheet icon-bobba cursor-pointer" />
                        </ContextMenuListItemView>
                    </Flex>
                    <ContextMenuListItemView onClick={(event) => processAction('rship_none')}>
                        {LocalizeText('avatar.widget.clear_relationship')}
                    </ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('back')}>
                        <FaChevronLeft className="left fa-icon" />
                        {LocalizeText('generic.back')}
                    </ContextMenuListItemView>
                </>
            )}
        </ContextMenuView>
    );
};
