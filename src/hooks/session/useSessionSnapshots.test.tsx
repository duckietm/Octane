/* @vitest-environment jsdom */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetEventDispatcher, GetSessionDataManager } from '../../octane-renderer.mock';
import { useHasPermission, usePermissionValue, useUserPermissions, useUserRank } from './useSessionSnapshots';

// ============================================================================
// Permission-driven API — useHasPermission / usePermissionValue /
// useUserPermissions / useUserRank (display).
//
// Wire-fed by Arcturus' UserPermissionsMapComposer (resolved against
// permission_definitions for the user's rank) + the legacy
// UserPermissionsComposer (clubLevel/securityLevel/isAmbassador + rank
// metadata extension). The renderer's SessionDataManager keeps two
// snapshots: userDataSnapshot (display info) and permissionsSnapshot
// (gating). Tests fake both sides.
// ============================================================================

const makeFakeDispatcher = () => {
    const listeners = new Map<string, Set<() => void>>();

    return {
        subscribe(type: string, cb: () => void): () => void {
            let bucket = listeners.get(type);
            if (!bucket) {
                bucket = new Set();
                listeners.set(type, bucket);
            }
            bucket.add(cb);
            return () => bucket!.delete(cb);
        },
        dispatch(type: string): void {
            listeners.get(type)?.forEach((cb) => cb());
        }
    };
};

interface FakeUserSnapshot {
    securityLevel: number;
    rankId: number;
    rankName: string;
    rankBadge: string;
    rankPrefix: string;
    rankPrefixColor: string;
}

const makeUserSnapshot = (overrides: Partial<FakeUserSnapshot> = {}): FakeUserSnapshot => ({
    securityLevel: 0,
    rankId: 0,
    rankName: '',
    rankBadge: '',
    rankPrefix: '',
    rankPrefixColor: '',
    ...overrides
});

describe('useHasPermission + usePermissionValue + useUserPermissions', () => {
    let userSnapshot: FakeUserSnapshot;
    let permissionsSnapshot: ReadonlyMap<string, number>;
    let fakeDispatcher: ReturnType<typeof makeFakeDispatcher>;

    beforeEach(() => {
        userSnapshot = makeUserSnapshot();
        permissionsSnapshot = new Map();
        fakeDispatcher = makeFakeDispatcher();

        vi.mocked(GetSessionDataManager).mockReturnValue({
            getUserDataSnapshot: () => userSnapshot,
            getPermissionsSnapshot: () => permissionsSnapshot
        } as any);

        vi.mocked(GetEventDispatcher).mockReturnValue(fakeDispatcher as any);
    });

    afterEach(() => {
        cleanup();
        vi.mocked(GetSessionDataManager).mockReset();
        vi.mocked(GetEventDispatcher).mockReset();
    });

    it('useUserRank surfaces rank metadata for presentational use', () => {
        userSnapshot = makeUserSnapshot({
            securityLevel: 5,
            rankId: 5,
            rankName: 'Moderator',
            rankBadge: 'ADM',
            rankPrefix: '[MOD]',
            rankPrefixColor: '#327fa8'
        });

        const { result } = renderHook(() => useUserRank());

        expect(result.current).toEqual({
            id: 5,
            name: 'Moderator',
            level: 5,
            badge: 'ADM',
            prefix: '[MOD]',
            prefixColor: '#327fa8'
        });
    });

    it('useHasPermission returns true only for ALLOWED (value 1), false for ROOM_OWNER/absent/zero', () => {
        permissionsSnapshot = new Map([
            ['acc_supporttool', 1], // ALLOWED
            ['acc_anyroomowner', 2], // ROOM_OWNER — requires room ownership at call time
            ['acc_closedice_room', 0] // DISALLOWED (shouldn't reach the client, but defensive)
        ]);

        // ALLOWED → true. Matches Habbo.hasPermission(key) which calls
        // Rank.hasPermission(key, false) → only ALLOWED short-circuits.
        expect(renderHook(() => useHasPermission('acc_supporttool')).result.current).toBe(true);

        // ROOM_OWNER → false. The server-side check requires the
        // caller to pass isRoomOwner=true, which the client doesn't
        // have ambiently. Code that needs to combine this with the
        // active room session should call usePermissionValue(key) and
        // check === 2 alongside roomSession.isRoomOwner.
        expect(renderHook(() => useHasPermission('acc_anyroomowner')).result.current).toBe(false);

        expect(renderHook(() => useHasPermission('acc_closedice_room')).result.current).toBe(false);
        expect(renderHook(() => useHasPermission('acc_unknown_key')).result.current).toBe(false);
    });

    it('usePermissionValue returns the raw integer (or 0 if absent)', () => {
        permissionsSnapshot = new Map([
            ['acc_supporttool', 1],
            ['acc_anyroomowner', 2]
        ]);

        expect(renderHook(() => usePermissionValue('acc_supporttool')).result.current).toBe(1);
        expect(renderHook(() => usePermissionValue('acc_anyroomowner')).result.current).toBe(2);
        expect(renderHook(() => usePermissionValue('acc_missing')).result.current).toBe(0);
    });

    it('useUserPermissions exposes the full map', () => {
        permissionsSnapshot = new Map([
            ['acc_supporttool', 1],
            ['acc_ambassador', 1]
        ]);

        const { result } = renderHook(() => useUserPermissions());

        expect(result.current.size).toBe(2);
        expect(result.current.get('acc_supporttool')).toBe(1);
        expect(result.current.get('acc_ambassador')).toBe(1);
    });

    it('re-renders when USER_PERMISSIONS_UPDATED fires after a runtime promote', () => {
        permissionsSnapshot = new Map();
        const { result } = renderHook(() => useHasPermission('acc_supporttool'));
        expect(result.current).toBe(false);

        act(() => {
            // Renderer invariant: every invalidation produces a NEW
            // map reference. The mock's OctaneEventType proxy resolves
            // any property to `mock:OctaneEventType:<PROP>`, so that's
            // the wire string useSessionSnapshots subscribes against.
            permissionsSnapshot = new Map([['acc_supporttool', 1]]);
            fakeDispatcher.dispatch('mock:OctaneEventType:USER_PERMISSIONS_UPDATED');
        });

        expect(result.current).toBe(true);
    });
});
