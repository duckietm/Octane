import { describe, expect, it } from 'vitest';
import { canChatWithFriendListEntry, canFollowFriendListEntry } from './friendsListActions.helpers';

describe('canFollowFriendListEntry', () =>
{
    it('hides Follow for Staff Chat regardless of its synthetic id', () =>
    {
        expect(canFollowFriendListEntry({ id: -1, name: 'Staff Chat', online: true, followingAllowed: true })).toBe(false);
        expect(canFollowFriendListEntry({ id: 42, name: ' staff chat ', online: true, followingAllowed: true })).toBe(false);
    });

    it('shows Follow only for online friends who allow following', () =>
    {
        expect(canFollowFriendListEntry({ id: 7, name: 'tester1', online: true, followingAllowed: true })).toBe(true);
        expect(canFollowFriendListEntry({ id: 7, name: 'tester1', online: true, followingAllowed: false })).toBe(false);
        expect(canFollowFriendListEntry({ id: 7, name: 'tester1', online: false, followingAllowed: true })).toBe(false);
    });
});

describe('canChatWithFriendListEntry', () =>
{
    it('offers chat to online friends, and to offline ones only when messages are stored for them', () =>
    {
        expect(canChatWithFriendListEntry({ online: true, persistedMessageUser: false, pocketHabboUser: false }, false)).toBe(true);
        expect(canChatWithFriendListEntry({ online: false, persistedMessageUser: true, pocketHabboUser: false }, true)).toBe(true);
        expect(canChatWithFriendListEntry({ online: false, persistedMessageUser: true, pocketHabboUser: false }, false)).toBe(false);
        expect(canChatWithFriendListEntry({ online: false, persistedMessageUser: false, pocketHabboUser: false }, true)).toBe(false);
    });
});
