import { describe, expect, it } from 'vitest';
import { GROUP_MEMBER_LEVEL, GROUP_MEMBER_RANK, resolveGroupMemberActions, resolveGroupMemberLevels, resolveRemoveConfirmKeys } from './groupMemberActions';

const manager = { isSelf: false, allowedToManage: true, blockingEnabled: true };

describe('resolveGroupMemberActions', () => {
    it('lets a manager kick and block a plain member', () => {
        const actions = resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.MEMBER });

        expect(actions).toEqual({ canRemove: true, canBlock: true, actionLinkKey: 'group.members.giverights', actionLinkActive: true });
    });

    it('never offers kick or block on the owner, yourself or a blocked user', () => {
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.OWNER })).toMatchObject({
            canRemove: false,
            canBlock: false,
            actionLinkKey: 'group.members.owner',
            actionLinkActive: false
        });
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.MEMBER, isSelf: true })).toMatchObject({ canRemove: false, canBlock: false });
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.BLOCKED })).toEqual({
            canRemove: false,
            canBlock: false,
            actionLinkKey: 'group.members.unblock',
            actionLinkActive: false
        });
    });

    it('offers reject but not block on a pending request', () => {
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.REQUESTED })).toEqual({
            canRemove: true,
            canBlock: false,
            actionLinkKey: 'group.members.accept',
            actionLinkActive: true
        });
    });

    it('hides block when the hotel disables group blocking and everything for non-managers', () => {
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.ADMIN, blockingEnabled: false })).toMatchObject({
            canRemove: true,
            canBlock: false,
            actionLinkKey: 'group.members.removerights'
        });
        expect(resolveGroupMemberActions({ ...manager, rank: GROUP_MEMBER_RANK.MEMBER, allowedToManage: false })).toMatchObject({
            canRemove: false,
            canBlock: false
        });
    });
});

describe('resolveGroupMemberLevels', () => {
    it('adds the pending and blocked filters only for managers with blocking enabled', () => {
        expect(resolveGroupMemberLevels(false, true)).toEqual([GROUP_MEMBER_LEVEL.ALL, GROUP_MEMBER_LEVEL.ADMINS]);
        expect(resolveGroupMemberLevels(true, false)).toEqual([GROUP_MEMBER_LEVEL.ALL, GROUP_MEMBER_LEVEL.ADMINS, GROUP_MEMBER_LEVEL.PENDING]);
        expect(resolveGroupMemberLevels(true, true)).toEqual([0, 1, 2, 3]);
    });
});

describe('resolveRemoveConfirmKeys', () => {
    it('switches between the kick and block texts and the furni variants', () => {
        expect(resolveRemoveConfirmKeys(false, 3)).toEqual({ title: 'group.kickconfirm.title', desc: 'group.kickconfirm.desc' });
        expect(resolveRemoveConfirmKeys(false, 0)).toEqual({ title: 'group.kickconfirm.title', desc: 'group.kickconfirm_nofurni.desc' });
        expect(resolveRemoveConfirmKeys(true, 2)).toEqual({ title: 'group.blockconfirm.title', desc: 'group.blockconfirm.desc' });
        expect(resolveRemoveConfirmKeys(true, 0)).toEqual({ title: 'group.blockconfirm.title', desc: 'group.blockconfirm_nofurni.desc' });
    });
});
