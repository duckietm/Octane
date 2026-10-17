import { CreateLinkEvent, GetSessionDataManager, GroupDeleteComposer, GroupInformationParser } from '@octane/renderer';
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
import { useGroupLeave, useNotification } from '../../../hooks';
import { BaseButton } from '../../../common/BaseButton';

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

    // The official leave: the server names the furni left behind first (shared removal transaction), then a confirmation sends the removal.
    const leaveGroup = useGroupLeave(groupInformation?.id ?? 0, onClose);
    // GroupDetailsCtrl: the owner, or staff with security level 5, may delete the group from its information.
    const canDelete = !!groupInformation && (groupInformation.isOwner || GetSessionDataManager().hasSecurity(5));

    const deleteGroup = () => {
        const groupId = groupInformation.id;
        let isSent = false;

        showConfirm(
            LocalizeText('group.deleteconfirm.desc'),
            () => {
                if (isSent) return;

                isSent = true;
                SendMessageComposer(new GroupDeleteComposer(groupId));
            },
            null,
            null,
            null,
            LocalizeText('group.deleteconfirm.title')
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
                    <BaseButton
                        className="octane-extended-profile-group-info__member-link"
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => { event.stopPropagation(); handleAction('members'); }}
                    >
                        {LocalizeText('group.membercount', ['totalMembers'], [groupInformation.membersCount.toString()])}
                    </BaseButton>
                    {groupInformation.pendingRequestsCount > 0 && (
                        <BaseButton
                            className="octane-extended-profile-group-info__member-link"
                            type="button"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => { event.stopPropagation(); handleAction('members_pending'); }}
                        >
                            {LocalizeText('group.pendingmembercount', ['amount'], [groupInformation.pendingRequestsCount.toString()])}
                        </BaseButton>
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
                    <Text component={BaseButton} type="button" pointer small underline onClick={() => handleAction('homeroom')}>
                        {LocalizeText('group.linktobase')}
                    </Text>
                    <Text component={BaseButton} type="button" pointer small underline onClick={() => handleAction('furniture')}>
                        {LocalizeText('group.buyfurni')}
                    </Text>
                    <Text component={BaseButton} type="button" pointer small underline onClick={() => handleAction('popular_groups')}>
                        {LocalizeText('group.showgroups')}
                    </Text>
                    {groupInformation.hasForum && (
                        <Text component={BaseButton} type="button" pointer small underline onClick={() => handleAction('forum')}>
                            {LocalizeText('group.showforum')}
                        </Text>
                    )}
                    {groupInformation.isOwner && (
                        <Text component={BaseButton} type="button" pointer small underline onClick={() => handleAction('manage')}>
                            {LocalizeText('group.manage')}
                        </Text>
                    )}
                    {canDelete && (
                        <Text component={BaseButton} type="button" pointer small underline onClick={deleteGroup}>
                            {LocalizeText('group.delete')}
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
