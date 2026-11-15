import { describe, expect, it } from 'vitest';
import { groupChannelOf } from './groupChannel';

describe('groupChannelOf', () => {
    it('reads the group, its badge and its room from a channel figure', () => {
        expect(groupChannelOf({ id: -2, figure: 'group|42|b0503Xs09114s05014|1200' })).toEqual({
            groupId: 42,
            badgeCode: 'b0503Xs09114s05014',
            roomId: 1200
        });
    });

    it('keeps a channel whose group has no room', () => {
        expect(groupChannelOf({ id: -2, figure: 'group|42|b05' })).toEqual({ groupId: 42, badgeCode: 'b05', roomId: 0 });
    });

    it('is no channel for a player, Staff Chat or a bad figure', () => {
        expect(groupChannelOf({ id: 7, figure: 'group|42|b05|1' })).toBeNull();
        expect(groupChannelOf({ id: -1, figure: 'ADM' })).toBeNull();
        expect(groupChannelOf({ id: -2, figure: 'group|x|b05|1' })).toBeNull();
        expect(groupChannelOf(null)).toBeNull();
    });
});
