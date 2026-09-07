import {
    AddLinkEventTracker,
    GetSessionDataManager,
    GroupAdminGiveComposer,
    GroupAdminTakeComposer,
    GroupConfirmMemberRemoveEvent,
    GroupConfirmRemoveMemberComposer,
    GroupMemberParser,
    GroupMembersComposer,
    GroupMembersEvent,
    GroupMembershipAcceptComposer,
    GroupMembershipDeclineComposer,
    GroupMembersParser,
    GroupRank,
    GroupRemoveMemberComposer,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    UnblockGroupMemberMessageComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
import { useMessageEvent, useNotification } from '../../../hooks';
import { classNames } from '../../../layout';
import { GROUP_MEMBER_LEVEL, GROUP_MEMBER_RANK, resolveGroupMemberActions, resolveGroupMemberLevels, resolveRemoveConfirmKeys } from './groupMemberActions';

const LEVEL_TEXT_KEYS: Record<number, string> = {
    [GROUP_MEMBER_LEVEL.ALL]: 'group.members.search.all',
    [GROUP_MEMBER_LEVEL.ADMINS]: 'group.members.search.admins',
    [GROUP_MEMBER_LEVEL.PENDING]: 'group.members.search.pending',
    [GROUP_MEMBER_LEVEL.BLOCKED]: 'group.members.search.blocked'
};

const localizeLevel = (level: number) =>
    level === GROUP_MEMBER_LEVEL.BLOCKED ? localizeWithFallback(LEVEL_TEXT_KEYS[level], 'Show blocked members') : LocalizeText(LEVEL_TEXT_KEYS[level]);

export const GroupMembersView: FC<{}> = (props) => {
    const [groupId, setGroupId] = useState<number>(-1);
    const [levelId, setLevelId] = useState<number>(-1);
    const [membersData, setMembersData] = useState<GroupMembersParser>(null);
    const [pageId, setPageId] = useState<number>(-1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState<string>('');
    // AIR 13: the kick confirmation is reused for "block" (KickMember with the block flag set).
    const [pendingRemoval, setPendingRemoval] = useState<{ name: string; block: boolean }>(null);
    const { showConfirm = null } = useNotification();
    const pendingActionsRef = useRef<Set<string>>(new Set());
    const blockingEnabled = GetConfigurationValue<boolean>('group.blocking.enabled', true) !== false;

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

        refreshMembers();
    };

    const acceptMembership = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank !== GroupRank.REQUESTED) return;

        const key = `accept_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        SendMessageComposer(new GroupMembershipAcceptComposer(membersData.groupId, member.id));

        refreshMembers();
    };

    const removeMemberOrDeclineMembership = (member: GroupMemberParser, block = false) => {
        if (!membersData.admin) return;

        const key = `remove_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        if (member.rank === GroupRank.REQUESTED) {
            if (block) return;

            SendMessageComposer(new GroupMembershipDeclineComposer(membersData.groupId, member.id));

            refreshMembers();

            return;
        }

        setPendingRemoval({ name: member.name, block });
        SendMessageComposer(new GroupConfirmRemoveMemberComposer(membersData.groupId, member.id));
    };

    const unblockMember = (member: GroupMemberParser) => {
        if (!membersData.admin || member.rank !== GROUP_MEMBER_RANK.BLOCKED) return;

        const key = `unblock_${member.id}`;
        if (pendingActionsRef.current.has(key)) return;
        pendingActionsRef.current.add(key);
        setTimeout(() => pendingActionsRef.current.delete(key), 2000);

        SendMessageComposer(new UnblockGroupMemberMessageComposer(membersData.groupId, member.id));

        refreshMembers();
    };

    useMessageEvent<GroupMembersEvent>(GroupMembersEvent, (event) => {
        const parser = event.getParser();

        setMembersData(parser);
        setLevelId(parser.level);
        setTotalPages(Math.ceil(parser.totalMembersCount / parser.pageSize));
    });

    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        const parser = event.getParser();
        const block = pendingRemoval?.block ?? false;
        const keys = resolveRemoveConfirmKeys(block, parser.furnitureCount);
        const parameters = ['user', 'amount'];
        const replacements = [pendingRemoval?.name ?? '', parser.furnitureCount.toString()];
        const message = block
            ? localizeWithFallback(
                  keys.desc,
                  parser.furnitureCount > 0
                      ? '%user% has %amount% Furnis in the Group homeroom. Are you sure you want to block this Habbo from the Group?'
                      : 'Are you sure you want to block %user% from this Group?',
                  parameters,
                  replacements
              )
            : LocalizeText(keys.desc, parameters, replacements);
        const title = block ? localizeWithFallback(keys.title, 'Confirm block from Group') : LocalizeText(keys.title);

        showConfirm(
            message,
            () => {
                SendMessageComposer(new GroupRemoveMemberComposer(membersData.groupId, parser.userId, block));

                refreshMembers();
            },
            null,
            null,
            null,
            title
        );

        setPendingRemoval(null);
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
        setPendingRemoval(null);
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
                        <select className="octane-groups-select form-select form-select-sm w-full" value={levelId} onChange={(event) => setLevelId(parseInt(event.target.value))}>
                            {resolveGroupMemberLevels(membersData.admin, blockingEnabled).map((level) => (
                                <option key={level} value={level}>
                                    {localizeLevel(level)}
                                </option>
                            ))}
                        </select>
                    </Column>
                </div>
                <Grid className="octane-group-members-list-grid" columnCount={2} overflow="auto">
                    {membersData.result.map((member, index) => {
                        const actions = resolveGroupMemberActions({
                            rank: member.rank,
                            isSelf: member.id === GetSessionDataManager().userId,
                            allowedToManage: membersData.admin,
                            blockingEnabled
                        });
                        const blocked = member.rank === GROUP_MEMBER_RANK.BLOCKED;

                        return (
                            <Flex key={index} alignItems="center" className="octane-group-member-row" gap={0} overflow="hidden">
                                <div className="octane-group-member-row__avatar cursor-pointer" onClick={() => GetUserProfile(member.id)}>
                                    <LayoutAvatarImageView
                                        className="octane-group-member-row__head"
                                        direction={2}
                                        figure={member.figure}
                                        headOnly={true}
                                        compactHead
                                        compactHeadSize={40}
                                        compactHeadPadding={0}
                                    />
                                </div>
                                <Column className="octane-group-member-row__copy" grow gap={0}>
                                    <Text bold pointer small className="octane-group-member-row__name" onClick={(event) => GetUserProfile(member.id)}>
                                        {member.name}
                                    </Text>
                                    {blocked && (
                                        <Text
                                            small
                                            pointer
                                            className="octane-group-member-row__since octane-group-member-row__unblock"
                                            onClick={() => unblockMember(member)}
                                        >
                                            {localizeWithFallback('group.members.unblock', 'Unblock')}
                                        </Text>
                                    )}
                                    {!blocked && member.rank !== GroupRank.REQUESTED && (
                                        <Text italics small variant="muted" className="octane-group-member-row__since">
                                            {LocalizeText('group.members.since', ['date'], [member.joinedAt])}
                                        </Text>
                                    )}
                                </Column>
                                <div className="octane-group-member-row__actions">
                                    {!blocked && member.rank !== GroupRank.REQUESTED && (
                                        <div className="flex items-center justify-center">
                                            <div
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
                                            <div
                                                className="cursor-pointer octane-friends-spritesheet icon-accept"
                                                title={LocalizeText('group.members.accept')}
                                                onClick={(event) => acceptMembership(member)}
                                            />
                                        </Flex>
                                    )}
                                    {actions.canBlock && (
                                        <Flex alignItems="center">
                                            <div
                                                className="cursor-pointer octane-friends-spritesheet icon-deny octane-group-member-row__block"
                                                title={localizeWithFallback('group.members.block', 'Block from Group')}
                                                onClick={(event) => removeMemberOrDeclineMembership(member, true)}
                                            />
                                        </Flex>
                                    )}
                                    {actions.canRemove && (
                                        <Flex alignItems="center">
                                            <div
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
                <Flex alignItems="center" gap={1} justifyContent="between" className="octane-groups-footer octane-group-members-footer">
                    <Button className="octane-groups-button octane-groups-button--pager" disabled={pageId <= 0} onClick={(event) => setPageId((prevValue) => Math.max(0, prevValue - 1))}>
                        <FaChevronLeft className="fa-icon" />
                    </Button>
                    <div className="octane-group-members-footer__page">
                        <Text small className="octane-group-members-footer__label">
                            {membersData.totalMembersCount} Habbo Membri. Pagina
                        </Text>
                        <input
                            className="octane-group-members-footer__input"
                            type="number"
                            min={1}
                            max={Math.max(1, totalPages)}
                            value={membersData.pageIndex + 1}
                            onChange={(event) => {
                                const value = Math.min(Math.max(parseInt(event.target.value) || 1, 1), Math.max(1, totalPages));
                                setPageId(value - 1);
                            }}
                        />
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
