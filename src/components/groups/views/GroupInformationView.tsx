import { CreateLinkEvent, GetSessionDataManager, GroupInformationParser, GroupRemoveMemberComposer } from '@octane/renderer';
import { FC } from 'react';
import {
    CatalogPageName,
    GetGroupManager,
    GetGroupMembers,
    GroupMembershipType,
    GroupType,
    LocalizeText,
    SendMessageComposer,
    TryJoinGroup,
    TryVisitRoom
} from '../../../api';
import { Button, LayoutBadgeImageView, Text } from '../../../common';
import { useNotification } from '../../../hooks';

const STATES: string[] = ['regular', 'exclusive', 'private'];

interface GroupInformationViewProps {
    groupInformation: GroupInformationParser;
    onClose?: () => void;
}

export const GroupInformationView: FC<GroupInformationViewProps> = (props) => {
    const { groupInformation = null, onClose = null } = props;
    const { showConfirm = null } = useNotification();

    const isRealOwner = groupInformation && groupInformation.ownerName === GetSessionDataManager().userName;

    const joinGroup = () => groupInformation && TryJoinGroup(groupInformation.id);

    const leaveGroup = () => {
        showConfirm(
            LocalizeText('group.leaveconfirm.desc'),
            () => {
                SendMessageComposer(new GroupRemoveMemberComposer(groupInformation.id, GetSessionDataManager().userId));

                if (onClose) onClose();
            },
            null
        );
    };

    const getRoleIcon = () => {
        if (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER || groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING)
            return null;

        if (isRealOwner) return <i className="octane-icon icon-group-owner" title={LocalizeText('group.youareowner')} />;

        if (groupInformation.isAdmin) return <i className="octane-icon icon-group-admin" title={LocalizeText('group.youareadmin')} />;

        return <i className="octane-icon icon-group-member" title={LocalizeText('group.youaremember')} />;
    };

    const getButtonText = () => {
        if (isRealOwner) return 'group.youareowner';

        if (groupInformation.type === GroupType.PRIVATE && groupInformation.membershipType !== GroupMembershipType.MEMBER) return '';

        if (groupInformation.membershipType === GroupMembershipType.MEMBER) return 'group.leave';

        if (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER && groupInformation.type === GroupType.REGULAR) return 'group.join';

        if (groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING) return 'group.membershippending';

        if (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER && groupInformation.type === GroupType.EXCLUSIVE)
            return 'group.requestmembership';
    };

    const handleButtonClick = () => {
        if (groupInformation.type === GroupType.PRIVATE && groupInformation.membershipType === GroupMembershipType.NOT_MEMBER) return;

        if (groupInformation.membershipType === GroupMembershipType.MEMBER) {
            leaveGroup();

            return;
        }

        joinGroup();
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'members':
                GetGroupMembers(groupInformation.id, 0);
                break;
            case 'members_pending':
                GetGroupMembers(groupInformation.id, 2);
                break;
            case 'manage':
                GetGroupManager(groupInformation.id);
                break;
            case 'homeroom':
                TryVisitRoom(groupInformation.roomId);
                break;
            case 'furniture':
                CreateLinkEvent('catalog/open/' + CatalogPageName.GUILD_CUSTOM_FURNI);
                break;
            case 'popular_groups':
                CreateLinkEvent('navigator/search/groups');
                break;
            case 'forum':
                CreateLinkEvent('groupforum/' + groupInformation.id);
                break;
        }
    };

    if (!groupInformation) return null;

    return (
        <div className="octane-extended-profile-group-info">
            <div className="octane-extended-profile-group-info__badge-column">
                <div className="octane-extended-profile-group-info__badge-wrap group-badge">
                    <LayoutBadgeImageView badgeCode={groupInformation.badge} isGroup={true} scale={2.1} />
                </div>
                <div className="octane-extended-profile-group-info__meta">
                    <span
                        className="octane-extended-profile-group-info__member-link"
                        role="button"
                        tabIndex={0}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => { event.stopPropagation(); handleAction('members'); }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleAction('members');
                        }}
                    >
                        {LocalizeText('group.membercount', ['totalMembers'], [groupInformation.membersCount.toString()])}
                    </span>
                    {groupInformation.pendingRequestsCount > 0 && (
                        <span
                            className="octane-extended-profile-group-info__member-link"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => { event.stopPropagation(); handleAction('members_pending'); }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                event.stopPropagation();
                                handleAction('members_pending');
                            }}
                        >
                            {LocalizeText('group.pendingmembercount', ['amount'], [groupInformation.pendingRequestsCount.toString()])}
                        </span>
                    )}
                </div>
                <div className="octane-extended-profile-group-info__role" aria-hidden="true">{getRoleIcon()}</div>
            </div>
            <div className="octane-extended-profile-group-info__content">
                <div className="octane-extended-profile-group-info__header-copy">
                    <div className="flex items-center gap-2">
                        <Text bold>{groupInformation.title}</Text>
                        <div className="flex gap-1">
                            <i
                                className={'octane-icon icon-group-type-' + groupInformation.type}
                                title={LocalizeText(`group.edit.settings.type.${STATES[groupInformation.type]}.help`)}
                            />
                            {groupInformation.canMembersDecorate && (
                                <i className="octane-icon icon-group-decorate" title={LocalizeText('group.memberscandecorate')} />
                            )}
                        </div>
                    </div>
                    <Text small>{LocalizeText('group.created', ['date', 'owner'], [groupInformation.createdAt, groupInformation.ownerName])}</Text>
                </div>
                <Text small className="octane-extended-profile-group-info__description" overflow="auto">
                    {groupInformation.description}
                </Text>
                <div className="octane-extended-profile-group-info__links">
                    <Text pointer small underline onClick={() => handleAction('homeroom')}>
                        {LocalizeText('group.linktobase')}
                    </Text>
                    <Text pointer small underline onClick={() => handleAction('furniture')}>
                        {LocalizeText('group.buyfurni')}
                    </Text>
                    <Text pointer small underline onClick={() => handleAction('popular_groups')}>
                        {LocalizeText('group.showgroups')}
                    </Text>
                    {groupInformation.hasForum && (
                        <Text pointer small underline onClick={() => handleAction('forum')}>
                            {LocalizeText('group.showforum')}
                        </Text>
                    )}
                    {groupInformation.isOwner && (
                        <Text pointer small underline onClick={() => handleAction('manage')}>
                            {LocalizeText('group.manage')}
                        </Text>
                    )}
                </div>
                {(groupInformation.type !== GroupType.PRIVATE ||
                    (groupInformation.type === GroupType.PRIVATE && groupInformation.membershipType === GroupMembershipType.MEMBER)) && (
                    <Button
                        className="octane-extended-profile-group-info__button"
                        disabled={groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING || isRealOwner}
                        onClick={handleButtonClick}
                    >
                        {LocalizeText(getButtonText())}
                    </Button>
                )}
            </div>
        </div>
    );
};
