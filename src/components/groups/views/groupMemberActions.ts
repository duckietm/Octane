/**
 * Pure decisions of the group members window (AIR 13 GuildMembersWindowCtrl.refreshUserEntry).
 *
 * Rank values follow the wire protocol: 0 owner, 1 admin, 2 member, 3 pending request, 4 blocked.
 */
export const GROUP_MEMBER_RANK = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    REQUESTED: 3,
    BLOCKED: 4
} as const;

/** Members list filters of the official dropdown; blocked is only offered to managers when blocking is enabled. */
export const GROUP_MEMBER_LEVEL = {
    ALL: 0,
    ADMINS: 1,
    PENDING: 2,
    BLOCKED: 3
} as const;

export interface IGroupMemberActionContext {
    rank: number;
    isSelf: boolean;
    allowedToManage: boolean;
    blockingEnabled: boolean;
}

export interface IGroupMemberActions {
    /** The kick / reject cross (hidden for owners, yourself, blocked members and non-managers). */
    canRemove: boolean;
    /** The block cross: full members only, never owners, yourself or already blocked users. */
    canBlock: boolean;
    /** The action link caption key; blocked members get "unblock" before any rank text. */
    actionLinkKey: string;
    /** Whether the action link is clickable (the official underlines it). */
    actionLinkActive: boolean;
}

export const isGroupMember = (rank: number): boolean => rank !== GROUP_MEMBER_RANK.REQUESTED;

export const resolveGroupMemberActions = (context: IGroupMemberActionContext): IGroupMemberActions => {
    const { rank, isSelf, allowedToManage, blockingEnabled } = context;
    const owner = rank === GROUP_MEMBER_RANK.OWNER;
    const blocked = rank === GROUP_MEMBER_RANK.BLOCKED;
    const member = isGroupMember(rank);

    const canRemove = !owner && !isSelf && allowedToManage && !blocked;
    const canBlock = member && !owner && !isSelf && allowedToManage && blockingEnabled && !blocked;

    let actionLinkKey = '';
    let actionLinkActive = false;

    if (blocked) {
        actionLinkKey = 'group.members.unblock';
    } else if (owner) {
        actionLinkKey = 'group.members.owner';
    } else if (rank === GROUP_MEMBER_RANK.ADMIN) {
        actionLinkKey = 'group.members.removerights';
        actionLinkActive = true;
    } else if (member) {
        actionLinkKey = 'group.members.giverights';
        actionLinkActive = true;
    } else {
        actionLinkKey = 'group.members.accept';
        actionLinkActive = true;
    }

    return { canRemove, canBlock, actionLinkKey, actionLinkActive };
};

/** The filter values shown in the dropdown for the current viewer. */
export const resolveGroupMemberLevels = (allowedToManage: boolean, blockingEnabled: boolean): number[] => {
    const levels: number[] = [GROUP_MEMBER_LEVEL.ALL, GROUP_MEMBER_LEVEL.ADMINS];

    if (allowedToManage) {
        levels.push(GROUP_MEMBER_LEVEL.PENDING);

        if (blockingEnabled) levels.push(GROUP_MEMBER_LEVEL.BLOCKED);
    }

    return levels;
};

/** Confirmation texts for a kick or a block (AIR 13 HabboGroupsManager.onKickConfirmation). */
export const resolveRemoveConfirmKeys = (block: boolean, furniCount: number): { title: string; desc: string } => {
    const prefix = block ? 'group.block' : 'group.kick';

    return {
        title: `${prefix}confirm.title`,
        desc: furniCount > 0 ? `${prefix}confirm.desc` : `${prefix}confirm_nofurni.desc`
    };
};
