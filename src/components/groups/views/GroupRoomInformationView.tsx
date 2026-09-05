import {
    DesktopViewEvent,
    GetGuestRoomResultEvent,
    GetSessionDataManager,
    GroupInformationComposer,
    GroupInformationEvent,
    GroupInformationParser,
    GroupRemoveMemberComposer,
    HabboGroupDeactivatedMessageEvent,
    RoomEntryInfoMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetGroupInformation, GetGroupManager, GroupMembershipType, GroupType, LocalizeText, SendMessageComposer, TryJoinGroup } from '../../../api';
import groupBaseIcon from '../../../assets/images/groups/swf/group_base_icon.png';
import { Button, Flex, LayoutBadgeImageView, Text } from '../../../common';
import { useMessageEvent, useNotification } from '../../../hooks';

export const GroupRoomInformationView: FC<{}> = (props) => {
    const expectedGroupIdRef = useRef<number>(0);
    const requestRetryCountRef = useRef<number>(0);
    const requestRetryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser>(null);
    const [isOpen, setIsOpen] = useState<boolean>(true);
    const { showConfirm = null } = useNotification();

    const clearRequestRetryTimeout = () => {
        if (!requestRetryTimeoutRef.current) return;

        clearTimeout(requestRetryTimeoutRef.current);
        requestRetryTimeoutRef.current = null;
    };

    const scheduleGroupInfoRetry = (groupId: number) => {
        if (requestRetryCountRef.current >= 2) return;

        clearRequestRetryTimeout();

        requestRetryTimeoutRef.current = setTimeout(() => {
            requestRetryTimeoutRef.current = null;

            if (expectedGroupIdRef.current !== groupId) return;
            if (groupInformation && groupInformation.id === groupId) return;

            requestRetryCountRef.current++;
            SendMessageComposer(new GroupInformationComposer(groupId, false));
            scheduleGroupInfoRetry(groupId);
        }, 700);
    };

    const requestGroupInformation = (groupId: number) => {
        if (groupId <= 0) return;

        requestRetryCountRef.current = 0;
        clearRequestRetryTimeout();

        SendMessageComposer(new GroupInformationComposer(groupId, false));
        scheduleGroupInfoRetry(groupId);
    };

    const resetGroupState = () => {
        expectedGroupIdRef.current = 0;
        requestRetryCountRef.current = 0;
        clearRequestRetryTimeout();
        setGroupInformation(null);
    };

    const setRequestedGroupId = (groupId: number) => {
        expectedGroupIdRef.current = groupId;
    };

    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, (event) => {
        resetGroupState();
    });

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, (event) => {
        resetGroupState();
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser.roomEnter) return;

        if (parser.data.habboGroupId > 0) {
            setRequestedGroupId(parser.data.habboGroupId);
            requestGroupInformation(parser.data.habboGroupId);
        } else {
            resetGroupState();
        }
    });

    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!groupInformation || (parser.groupId !== groupInformation.id && parser.groupId !== expectedGroupIdRef.current)) return;

        resetGroupState();
    });

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (parser.id !== expectedGroupIdRef.current) return;

        clearRequestRetryTimeout();
        setGroupInformation(parser);
    });

    useEffect(() => () => clearRequestRetryTimeout(), []);

    const leaveGroup = () => {
        showConfirm(
            LocalizeText('group.leaveconfirm.desc'),
            () => {
                SendMessageComposer(new GroupRemoveMemberComposer(groupInformation.id, GetSessionDataManager().userId));
            },
            null
        );
    };

    const isRealOwner = groupInformation && groupInformation.ownerName === GetSessionDataManager().userName;

    const getButtonText = () => {
        if (isRealOwner) return 'group.manage';

        if (groupInformation.type === GroupType.PRIVATE) return '';

        if (groupInformation.membershipType === GroupMembershipType.MEMBER) return 'group.leave';

        if (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER && groupInformation.type === GroupType.REGULAR) return 'group.join';

        if (groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING) return 'group.membershippending';

        if (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER && groupInformation.type === GroupType.EXCLUSIVE)
            return 'group.requestmembership';
    };

    const handleButtonClick = () => {
        if (isRealOwner) return GetGroupManager(groupInformation.id);

        if (groupInformation.type === GroupType.PRIVATE && groupInformation.membershipType === GroupMembershipType.NOT_MEMBER) return;

        if (groupInformation.membershipType === GroupMembershipType.MEMBER) {
            leaveGroup();

            return;
        }

        TryJoinGroup(groupInformation.id);
    };

    if (!groupInformation) return null;

    return (
        <div className={`octane-group-room-info pointer-events-auto ml-auto mt-[6px] overflow-hidden ${isOpen ? 'is-open' : 'is-closed'}`}>
            <div className="octane-group-room-info__contracted" onClick={() => setIsOpen((value) => !value)}>
                <img src={groupBaseIcon} alt="" className="octane-group-room-info__base-icon" draggable={false} />
                <Text variant="white" className="octane-group-room-info__title">
                    {LocalizeText('group.homeroominfo.title')}
                </Text>
                <span className="octane-group-room-info__toggle" />
            </div>
            <div className="octane-group-room-info__content">
                <Flex pointer alignItems="center" className="octane-group-room-info__main" onClick={() => GetGroupInformation(groupInformation.id)}>
                    <div className="octane-group-room-info__badge">
                        <LayoutBadgeImageView badgeCode={groupInformation.badge} isGroup={true} />
                    </div>
                    <Text wrap variant="white" className="octane-group-room-info__group-name">
                        {groupInformation.title}
                    </Text>
                </Flex>
                {(groupInformation.type !== GroupType.PRIVATE || isRealOwner) && (
                    <div className="octane-group-room-info__button-wrap">
                        <Button
                            fullWidth
                            disabled={groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING}
                            className="octane-groups-button octane-group-room-info__button"
                            onClick={handleButtonClick}
                        >
                            {LocalizeText(getButtonText())}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
