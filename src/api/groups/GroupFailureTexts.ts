/** English fallbacks for the official group failure texts (group.edit.fail.*, group.joinfail.*, group.membermgmt.fail.*). */
const GROUP_EDIT_FAIL: Record<number, string> = {
    0: 'That room already has a group.',
    1: 'That group name can not be used.',
    2: 'You need Habbo Club to create a group.',
    3: 'You are already in as many groups as you can be.'
};

const GROUP_JOIN_FAIL: Record<number, string> = {
    0: 'This group is full.',
    1: 'You are already in as many groups as you can be.',
    2: 'This group is closed.',
    3: 'This group does not take requests right now.',
    4: 'You need Habbo Club to join more groups.',
    5: 'That user is already in as many groups as they can be.',
    6: 'That user is already in as many groups as they can be.'
};

const GROUP_MEMBER_MANAGEMENT_FAIL: Record<number, string> = {
    0: 'That member could not be changed.'
};

export type GroupFailureKind = 'edit' | 'join' | 'membermgmt';

const KEY_PREFIX: Record<GroupFailureKind, string> = {
    edit: 'group.edit.fail',
    join: 'group.joinfail',
    membermgmt: 'group.membermgmt.fail'
};

const FALLBACKS: Record<GroupFailureKind, Record<number, string>> = {
    edit: GROUP_EDIT_FAIL,
    join: GROUP_JOIN_FAIL,
    membermgmt: GROUP_MEMBER_MANAGEMENT_FAIL
};

export const getGroupFailureTextKey = (kind: GroupFailureKind, reason: number): string => `${KEY_PREFIX[kind]}.${reason}`;
export const getGroupFailureTitleKey = (kind: GroupFailureKind): string => `${KEY_PREFIX[kind]}.title`;
export const getGroupFailureFallback = (kind: GroupFailureKind, reason: number): string =>
    FALLBACKS[kind][reason] ?? 'Something went wrong with that group action.';
