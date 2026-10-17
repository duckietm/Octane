import {
    AddLinkEventTracker,
    ApproveAllMembershipRequestsMessageComposer,
    GetSessionDataManager,
    GroupAdminGiveComposer,
    GroupAdminTakeComposer,
    GroupConfirmMemberRemoveEvent,
    GroupMemberParser,
    GroupMembersComposer,
    GroupMembersEvent,
    GroupMembershipAcceptComposer,
    GroupMembershipDeclineComposer,
    GroupMembersParser,
    GroupMembersRefreshEvent,
    GroupMemberUpdateEvent,
    GroupRank,
    GroupRemoveMemberComposer,
    HabboGroupDeactivatedMessageEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    UnblockGroupMemberMessageComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaBan, FaChevronLeft, FaChevronRight, FaUndo } from 'react-icons/fa';
import { GetConfigurationValue, GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../api';
import {
    Button,
    Column,
    Flex,
    Grid,
    LayoutAvatarImageView,
    LayoutBadgeImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView,
    Text
} from '../../../common';
import { useGroupMemberRemoval, useMessageEvent, useNotification } from '../../../hooks';
import { classNames } from '../../../layout';
import { Select } from '../../../common/Select';
import { NumberInput } from '../../../common/NumberInput';
import { BaseButton } from '../../../common/BaseButton';

export const GroupMembersView: FC<{}> = (props) => {
    const [groupId, setGroupId] = useState<number>(-1);
    const [levelId, setLevelId] = useState<number>(-1);
    const [membersData, setMembersData] = useState<GroupMembersParser>(null);
    const [pageId, setPageId] = useState<number>(-1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const { showConfirm = null } = useNotification();
    const pendingActionsRef = useRef<Set<string>>(new Set());
    // The confirm reply only carries the user id, so remember who it was for and whether it was a kick or a block.
    const pendingRemovalRef = useRef<{ groupId: number; userId: number; name: string; block: boolean }>(null);
    // One outstanding GroupConfirmRemoveMember for every group window (Leave included), see useGroupMemberRemoval.
    const { request: requestMemberRemoval, claimReply, isCurrentSession } = useGroupMemberRemoval();
    const groupIdRef = useRef<number>(-1);
    const blockingEnabled = GetConfigurationValue<boolean>('group.blocking.enabled', true);

    // Read by the removal confirmation callback; refreshed before it can run.
    useLayoutEffect(() => {
        groupIdRef.current = groupId;
    });

    const askRemoval = (member: GroupMemberParser, block: boolean) => {
        if (requestMemberRemoval(membersData.groupId, member.id)) pendingRemovalRef.current = { groupId: membersData.groupId, userId: member.id, name: member.name, block };
    };

    const getRankDescription = (member: GroupMemberParser) => {
        if (member.rank === GroupRank.OWNER) return 'group.members.owner';

        if (membersData.admin) {
            if (member.rank === GroupRank.ADMIN) return 'group.members.removerights';

            if (member.rank === GroupRank.MEMBER) return 'group.members.giverights';
        }

        return '';
    };

    const refreshMembers = useCallback(() => {
        if (groupId === -1 || levelId === -1 || pageId === -1) return;

        SendMessageComposer(new GroupMembersComposer(groupId, pageId, searchQuery, levelId));
    }, [groupId, levelId, pageId, searchQuery]);

    const toggleAdmin = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank === GroupRank.OWNER) return;

        const key = `admin_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        if (member.rank !== GroupRank.ADMIN) SendMessageComposer(new GroupAdminGiveComposer(membersData.groupId, member.id));
        else SendMessageComposer(new GroupAdminTakeComposer(membersData.groupId, member.id));
    };

    const acceptMembership = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank !== GroupRank.REQUESTED) return;

        const key = `accept_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        SendMessageComposer(new GroupMembershipAcceptComposer(membersData.groupId, member.id));
    };

    const runOnce = (key: string) => {
        if (pendingActionsRef.current.has(key)) return false;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        return true;
    };

    const blockMember = (member: GroupMemberParser) => {
        if (!membersData.admin || !blockingEnabled) return;
        if (member.rank !== GroupRank.MEMBER && member.rank !== GroupRank.ADMIN) return;
        if (!runOnce(`remove_${member.id}`)) return;

        askRemoval(member, true);
    };

    const unblockMember = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank !== GroupRank.BLOCKED) return;
        if (!runOnce(`unblock_${member.id}`)) return;

        SendMessageComposer(new UnblockGroupMemberMessageComposer(membersData.groupId, member.id));
    };

    const acceptAllMemberships = () => {
        if (!membersData.admin || !runOnce('accept_all')) return;

        SendMessageComposer(new ApproveAllMembershipRequestsMessageComposer(membersData.groupId));
    };

    const removeMemberOrDeclineMembership = (member: GroupMemberParser) => {
        if (!membersData.admin) return;

        const key = `remove_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        if (member.rank === GroupRank.REQUESTED) {
            SendMessageComposer(new GroupMembershipDeclineComposer(membersData.groupId, member.id));

            return;
        }

        askRemoval(member, false);
    };

    useMessageEvent<GroupMembersEvent>(GroupMembersEvent, (event) => {
        const parser = event.getParser();
        const normalizedLevel = !parser.admin && levelId >= 2 && parser.level === 0;

        if (parser.groupId !== groupId || parser.query !== searchQuery || parser.pageIndex !== pageId) return;
        if (parser.level !== levelId && !normalizedLevel) return;

        setMembersData(parser);
        setLevelId(parser.level);
        setTotalPages(Math.ceil(parser.totalMembersCount / parser.pageSize));
    });

    useMessageEvent<GroupMemberUpdateEvent>(GroupMemberUpdateEvent, (event) => {
        if (event.getParser().groupId !== groupId) return;

        refreshMembers();
    });

    useMessageEvent<GroupMembersRefreshEvent>(GroupMembersRefreshEvent, (event) => {
        if (event.getParser().groupId !== groupId) return;

        refreshMembers();
    });

    // A deleted group closes its members window.
    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) => {
        if (event.getParser().groupId === groupId) setGroupId(-1);
    });

    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        const parser = event.getParser();
        const owned = claimReply(parser.userId);
        const pending = pendingRemovalRef.current;

        // Only the reply to this window's own request, for the group it still shows.
        if (!owned || !pending || pending.groupId !== owned.groupId || pending.userId !== owned.userId || pending.groupId !== groupId) return;

        pendingRemovalRef.current = null;

        const block = pending.block;
        const amount = parser.furnitureCount.toString();
        const name = pending.name ?? '';
        let text = LocalizeText(
            parser.furnitureCount > 0 ? 'group.kickconfirm.desc' : 'group.kickconfirm_nofurni.desc',
            ['user', 'amount'],
            [name, amount]
        );

        if (block) {
            text = (parser.furnitureCount > 0)
                ? localizeWithFallback('group.blockconfirm.desc', `${name} has ${amount} furni in the group home room. Block ${name} from the group?`, ['user', 'amount'], [name, amount])
                : localizeWithFallback('group.blockconfirm_nofurni.desc', `Block ${name} from the group? They can't request membership again until unblocked.`, ['user', 'amount'], [name, amount]);
        }

        let isSent = false;

        showConfirm(
            text,
            () => {
                // Valid only while this window still shows that group for the same signed-in user.
                if (isSent || pending.groupId !== groupIdRef.current || !isCurrentSession(owned)) return;

                isSent = true;
                SendMessageComposer(new GroupRemoveMemberComposer(pending.groupId, pending.userId, block));
            },
            null
        );
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                const groupId = parseInt(parts[1]) || -1;
                const levelId = Number.isInteger(parseInt(parts[2])) ? parseInt(parts[2]) : 0;

                setGroupId(groupId);
                setLevelId(levelId);
                setPageId(0);
            },
            eventUrlPrefix: 'group-members/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        setPageId(0);
    }, [groupId, levelId, searchQuery]);

    useEffect(() => {
        if (groupId === -1 || levelId === -1 || pageId === -1) return;

        SendMessageComposer(new GroupMembersComposer(groupId, pageId, searchQuery, levelId));
    }, [groupId, levelId, pageId, searchQuery]);

    useEffect(() => {
        if (groupId === -1) return;

        setMembersData(null);
        setTotalPages(0);
        setSearchQuery('');
        pendingRemovalRef.current = null;
    }, [groupId]);

    if (groupId === -1 || !membersData) return null;

    return (
        <OctaneCardView className="octane-groups-window octane-group-members" theme="primary-slim" isResizable={false}>
            <OctaneCardHeaderView
                headerText={LocalizeText('group.members.title', ['groupName'], [membersData ? membersData.groupTitle : ''])}
                onCloseClick={(event) => setGroupId(-1)}
            />
            <OctaneCardContentView className="octane-groups-content" overflow="hidden">
                <div className="octane-group-members-search flex gap-2">
                    <Flex center className="group-badge octane-group-members-search__badge">
                        <LayoutBadgeImageView badgeCode={membersData.badge} className="mx-auto block" isGroup={true} />
                    </Flex>
                    <Column fullWidth gap={1} className="octane-group-members-search__controls">
                        <input
                            className="octane-groups-input min-h-[calc(1.5em+.5rem+2px)] px-[.5rem] py-[.25rem] text-[.7875rem] rounded-[.2rem] w-full"
                            placeholder={LocalizeText('group.members.searchinfo')}
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                        <Select className="octane-groups-select form-select form-select-sm w-full" value={levelId} onChange={(event) => setLevelId(parseInt(event.target.value))}>
                            <option value="0">{LocalizeText('group.members.search.all')}</option>
                            <option value="1">{LocalizeText('group.members.search.admins')}</option>
                            {membersData.admin && <option value="2">{LocalizeText('group.members.search.pending')}</option>}
                            {membersData.admin && blockingEnabled && <option value="3">{localizeWithFallback('group.members.search.blocked', 'Show blocked users')}</option>}
                        </Select>
                    </Column>
                </div>
                <Grid className="octane-group-members-list-grid" columnCount={2} overflow="auto">
                    {membersData.result.map((member, index) => {
                        return (
                            <Flex key={index} alignItems="center" className="octane-group-member-row" gap={0} overflow="hidden">
                                <BaseButton type="button" className="octane-group-member-row__avatar cursor-pointer" onClick={() => GetUserProfile(member.id)}>
                                    <LayoutAvatarImageView
                                        className="octane-group-member-row__head"
                                        direction={2}
                                        figure={member.figure}
                                        headOnly={true}
                                        compactHead
                                        compactHeadSize={40}
                                        compactHeadPadding={0}
                                    />
                                </BaseButton>
                                <Column className="octane-group-member-row__copy" grow gap={0}>
                                    <Text component={BaseButton} type="button" bold pointer small className="octane-group-member-row__name" onClick={(event) => GetUserProfile(member.id)}>
                                        {member.name}
                                    </Text>
                                    {member.rank !== GroupRank.REQUESTED && (
                                        <Text italics small variant="muted" className="octane-group-member-row__since">
                                            {LocalizeText('group.members.since', ['date'], [member.joinedAt])}
                                        </Text>
                                    )}
                                </Column>
                                <div className="octane-group-member-row__actions">
                                    {member.rank !== GroupRank.REQUESTED && member.rank !== GroupRank.BLOCKED && (
                                        <div className="flex items-center justify-center">
                                            <BaseButton type="button" aria-label={LocalizeText(getRankDescription(member))}
                                                className={classNames(
                                                    `octane-icon icon-group-small-${member.rank === GroupRank.OWNER ? 'owner' : member.rank === GroupRank.ADMIN ? 'admin' : membersData.admin && member.rank === GroupRank.MEMBER ? 'not-admin' : ''}`,
                                                    membersData.admin && 'cursor-pointer'
                                                )}
                                                title={LocalizeText(getRankDescription(member))}
                                                onClick={(event) => toggleAdmin(member)}
                                            />
                                        </div>
                                    )}
                                    {membersData.admin && member.rank === GroupRank.REQUESTED && (
                                        <Flex alignItems="center">
                                            <BaseButton type="button" aria-label={LocalizeText('group.members.accept')}
                                                className="cursor-pointer octane-friends-spritesheet icon-accept"
                                                title={LocalizeText('group.members.accept')}
                                                onClick={(event) => acceptMembership(member)}
                                            />
                                        </Flex>
                                    )}
                                    {membersData.admin && member.rank === GroupRank.BLOCKED && (
                                        <Flex alignItems="center">
                                            <BaseButton
                                                className="octane-group-member-row__action cursor-pointer text-[#1e7295] hover:text-[#0d4a63]"
                                                title={localizeWithFallback('group.members.unblock', 'Unblock')}
                                                type="button"
                                                onClick={() => unblockMember(member)}
                                            >
                                                <FaUndo size={11} />
                                            </BaseButton>
                                        </Flex>
                                    )}
                                    {membersData.admin && blockingEnabled && (member.rank === GroupRank.MEMBER || member.rank === GroupRank.ADMIN) && member.id !== GetSessionDataManager().userId && (
                                        <Flex alignItems="center">
                                            <BaseButton
                                                className="octane-group-member-row__action cursor-pointer text-[#a81a12] hover:text-[#6f0f0a]"
                                                title={localizeWithFallback('group.members.block', 'Block from group')}
                                                type="button"
                                                onClick={() => blockMember(member)}
                                            >
                                                <FaBan size={11} />
                                            </BaseButton>
                                        </Flex>
                                    )}
                                    {membersData.admin && member.rank !== GroupRank.OWNER && member.rank !== GroupRank.BLOCKED && member.id !== GetSessionDataManager().userId && (
                                        <Flex alignItems="center">
                                            <BaseButton type="button" aria-label={LocalizeText(member.rank === GroupRank.REQUESTED ? 'group.members.reject' : 'group.members.kick')}
                                                className="cursor-pointer octane-friends-spritesheet icon-deny"
                                                title={LocalizeText(member.rank === GroupRank.REQUESTED ? 'group.members.reject' : 'group.members.kick')}
                                                onClick={(event) => removeMemberOrDeclineMembership(member)}
                                            />
                                        </Flex>
                                    )}
                                </div>
                            </Flex>
                        );
                    })}
                </Grid>
                {membersData.admin && levelId === 2 && membersData.result.length > 0 && (
                    <Button className="octane-groups-button" onClick={acceptAllMemberships}>
                        {localizeWithFallback('group.members.acceptall', 'Accept all')}
                    </Button>
                )}
                <Flex alignItems="center" gap={1} justifyContent="between" className="octane-groups-footer octane-group-members-footer">
                    <Button className="octane-groups-button octane-groups-button--pager" disabled={pageId <= 0} onClick={(event) => setPageId((prevValue) => Math.max(0, prevValue - 1))}>
                        <FaChevronLeft className="fa-icon" />
                    </Button>
                    <div className="octane-group-members-footer__page">
                        <Text small className="octane-group-members-footer__label">
                            {localizeWithFallback('group.members.members', `Members (${membersData.totalMembersCount})`, ['count'], [membersData.totalMembersCount.toString()])}
                        </Text>
                        <NumberInput className="octane-group-members-footer__input" min={1} max={Math.max(1, totalPages)} value={membersData.pageIndex + 1} onChange={(event) => {
                                const value = Math.min(Math.max(parseInt(event.target.value) || 1, 1), Math.max(1, totalPages));
                                setPageId(value - 1);
                            }} />
                        <Text small className="octane-group-members-footer__total">
                            / {Math.max(1, totalPages)}
                        </Text>
                    </div>
                    <Button
                        className="octane-groups-button octane-groups-button--pager"
                        disabled={totalPages === 0 || pageId >= totalPages - 1}
                        onClick={(event) => setPageId((prevValue) => Math.min(totalPages - 1, prevValue + 1))}
                    >
                        <FaChevronRight className="fa-icon" />
                    </Button>
                </Flex>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
