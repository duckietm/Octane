import { describe, expect, it } from 'vitest';
import { AvatarInfoUser } from '../../../api/room/widgets/AvatarInfoUser';
import type { IAvatarInfo } from '../../../api/room/widgets/IAvatarInfo';
import { applyFavouriteGroupUpdate, applyUserBadgesUpdate, applyUserFigureUpdate } from './avatarInfo.reducers';

/**
 * Pure reducers for the InfoStand pilot. They take the inspected
 * AvatarInfoUser plus a room-session event and return the next state
 * (or the same reference if the event doesn't apply, to let React
 * skip the re-render).
 *
 * The TS types reference renderer event classes
 * (RoomSessionUserBadgesEvent etc.) but the reducer body only reads
 * plain fields — no `instanceof EventType` checks — so the tests can
 * pass plain objects cast to the renderer types.
 */

const buildAvatarInfoUser = (overrides: Partial<AvatarInfoUser> = {}): AvatarInfoUser => {
    const instance = new AvatarInfoUser(AvatarInfoUser.OWN_USER);

    Object.assign(instance, overrides);

    return instance;
};

describe('applyUserBadgesUpdate', () => {
    it('returns the same reference when state is not an AvatarInfoUser', () => {
        const state: IAvatarInfo = { type: 'NOT_USER' } as IAvatarInfo;
        const event = { userId: 42, badges: ['a'] } as any;

        expect(applyUserBadgesUpdate(state, event)).toBe(state);
    });

    it('returns the same reference when state is null', () => {
        const event = { userId: 42, badges: ['a'] } as any;

        expect(applyUserBadgesUpdate(null, event)).toBeNull();
    });

    it('returns the same reference when the event is for a different user', () => {
        const state = buildAvatarInfoUser({ webID: 1, badges: [] });
        const event = { userId: 99, badges: ['a'] } as any;

        expect(applyUserBadgesUpdate(state, event)).toBe(state);
    });

    it('returns the same reference when the dedup result equals the existing badges', () => {
        const state = buildAvatarInfoUser({ webID: 42, badges: ['a', 'b'] });
        const event = { userId: 42, badges: ['a', 'b'] } as any;

        expect(applyUserBadgesUpdate(state, event)).toBe(state);
    });

    it('returns a cloned AvatarInfoUser with deduped badges when the event applies', () => {
        const state = buildAvatarInfoUser({ webID: 42, badges: ['a'], name: 'alice' });
        const event = { userId: 42, badges: ['b', 'b', 'c'] } as any;

        const next = applyUserBadgesUpdate(state, event) as AvatarInfoUser;

        expect(next).not.toBe(state);
        expect(next).toBeInstanceOf(AvatarInfoUser);
        expect(next.badges).toEqual(['b', '', 'c']);
        // surrounding fields propagate via Object.assign
        expect(next.name).toBe('alice');
    });
});

describe('applyUserFigureUpdate', () => {
    it('returns the same reference when state is not an AvatarInfoUser', () => {
        const state: IAvatarInfo = { type: 'NOT_USER' } as IAvatarInfo;
        const event = { roomIndex: 5, figure: 'hr-100' } as any;

        expect(applyUserFigureUpdate(state, event)).toBe(state);
    });

    it('ignores events targeting a different roomIndex', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3, figure: 'old' });
        const event = { roomIndex: 7, figure: 'new' } as any;

        expect(applyUserFigureUpdate(state, event)).toBe(state);
    });

    it('applies all figure-related fields when roomIndex matches', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3 });
        const event = {
            roomIndex: 3,
            figure: 'hr-100-7.hd-180-1',
            customInfo: 'new motto',
            activityPoints: 1234,
            nickIcon: 'icon-vip',
            backgroundId: 8,
            standId: 4,
            overlayId: 2,
            cardBackgroundId: 9
        } as any;

        const next = applyUserFigureUpdate(state, event) as AvatarInfoUser;

        expect(next).not.toBe(state);
        expect(next.figure).toBe('hr-100-7.hd-180-1');
        expect(next.motto).toBe('new motto');
        expect(next.achievementScore).toBe(1234);
        expect(next.nickIcon).toBe('icon-vip');
        expect(next.backgroundId).toBe(8);
        expect(next.standId).toBe(4);
        expect(next.overlayId).toBe(2);
        expect(next.cardBackgroundId).toBe(9);
    });

    it('defaults cardBackgroundId to 0 when the server omits it', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3, cardBackgroundId: 7 });
        const event = {
            roomIndex: 3,
            figure: 'x',
            customInfo: '',
            activityPoints: 0,
            nickIcon: '',
            backgroundId: 0,
            standId: 0,
            overlayId: 0
            // no cardBackgroundId
        } as any;

        const next = applyUserFigureUpdate(state, event) as AvatarInfoUser;

        expect(next.cardBackgroundId).toBe(0);
    });
});

describe('applyFavouriteGroupUpdate', () => {
    const resolveGroupBadge = (groupId: number) => `badge-${groupId}`;

    it('returns the same reference when state is not an AvatarInfoUser', () => {
        const state: IAvatarInfo = { type: 'NOT_USER' } as IAvatarInfo;
        const event = { roomIndex: 5, status: 1, habboGroupId: 42, habboGroupName: 'Cool Group' } as any;

        expect(applyFavouriteGroupUpdate(state, event, resolveGroupBadge)).toBe(state);
    });

    it('ignores events targeting a different roomIndex', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3 });
        const event = { roomIndex: 7, status: 1, habboGroupId: 42, habboGroupName: 'g' } as any;

        expect(applyFavouriteGroupUpdate(state, event, resolveGroupBadge)).toBe(state);
    });

    it('applies a fresh group when status is positive and groupId is positive', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3, groupId: -1 });
        const event = { roomIndex: 3, status: 1, habboGroupId: 42, habboGroupName: 'Cool Group' } as any;

        const next = applyFavouriteGroupUpdate(state, event, resolveGroupBadge) as AvatarInfoUser;

        expect(next.groupId).toBe(42);
        expect(next.groupName).toBe('Cool Group');
        expect(next.groupBadgeId).toBe('badge-42');
    });

    it('clears the group when status is -1', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3, groupId: 42, groupName: 'old', groupBadgeId: 'badge-42' });
        const event = { roomIndex: 3, status: -1, habboGroupId: 42, habboGroupName: 'ignored' } as any;

        const next = applyFavouriteGroupUpdate(state, event, resolveGroupBadge) as AvatarInfoUser;

        expect(next.groupId).toBe(-1);
        expect(next.groupName).toBeNull();
        expect(next.groupBadgeId).toBeNull();
    });

    it('clears the group when habboGroupId is 0 (no favourite)', () => {
        const state = buildAvatarInfoUser({ roomIndex: 3, groupId: 7 });
        const event = { roomIndex: 3, status: 1, habboGroupId: 0, habboGroupName: 'ignored' } as any;

        const next = applyFavouriteGroupUpdate(state, event, resolveGroupBadge) as AvatarInfoUser;

        expect(next.groupId).toBe(-1);
        expect(next.groupName).toBeNull();
    });
});
