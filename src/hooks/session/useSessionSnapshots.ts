import {
    GetEventDispatcher,
    GetRoomSessionManager,
    GetSessionDataManager,
    GetSoundManager,
    IRoomSessionSnapshot,
    IRoomUserData,
    ISoundVolumesSnapshot,
    IUserDataSnapshot,
    OctaneEventType
} from '@octane/renderer';
import { useMemo } from 'react';
import { useExternalSnapshot } from '../events/useExternalSnapshot';

/**
 * React-side consumers for the referentially-stable snapshot getters
 * the renderer exposes (Octane Renderer v2.1.0+ pattern).
 *
 * Every hook here is a thin `useSyncExternalStore` wrapper: it subscribes
 * to the corresponding `OctaneEventType.*_UPDATED` invalidation event and
 * reads the matching `getXxxSnapshot()`. Because the renderer guarantees
 * snapshot reference invariance until invalidation, React's bailout logic
 * skips re-renders when the snapshot is unchanged — so widgets that read
 * the same slice across many components share a single subscription and
 * only re-paint when the underlying state actually changes.
 *
 * Prefer these over reaching into the manager directly with
 * `GetSessionDataManager().userId` etc., which never trigger a re-render
 * when the value changes.
 *
 * The hooks are intentionally defensive: every call site is wrapped in a
 * "is this method available?" guard so a renderer-version mismatch
 * (e.g. a stale `dist/` shadowing the source) degrades to a stable empty
 * fallback instead of crashing the React tree with `(intermediate value)()
 * is undefined` during the first paint.
 */

// Module-level frozen defaults — referentially stable so the React bailout
// keeps working when a manager method is unavailable.
const NOOP_UNSUBSCRIBE = (): void => undefined;

const DEFAULT_USER_DATA: Readonly<IUserDataSnapshot> = Object.freeze({
    userId: 0,
    userName: '',
    figure: '',
    gender: '',
    realName: '',
    respectsReceived: 0,
    respectsLeft: 0,
    respectsPetLeft: 0,
    canChangeName: false,
    clubLevel: 0,
    securityLevel: 0,
    isAmbassador: false,
    isEmailVerified: false,
    isNoob: false,
    isAuthenticHabbo: false,
    isSystemOpen: false,
    isSystemShutdown: false,
    uiFlags: 0,
    tags: Object.freeze<string[]>([]) as ReadonlyArray<string>,
    rankId: 0,
    rankName: '',
    rankBadge: '',
    rankPrefix: '',
    rankPrefixColor: ''
}) as Readonly<IUserDataSnapshot>;

const EMPTY_IGNORED_LIST: ReadonlyArray<string> = Object.freeze<string[]>([]) as ReadonlyArray<string>;
const EMPTY_GROUP_BADGES: ReadonlyMap<number, string> = new Map();
const EMPTY_USER_LIST: ReadonlyArray<IRoomUserData> = Object.freeze<IRoomUserData[]>([]) as ReadonlyArray<IRoomUserData>;
const EMPTY_PERMISSIONS: ReadonlyMap<string, number> = new Map();

const DEFAULT_VOLUMES: Readonly<ISoundVolumesSnapshot> = Object.freeze({
    system: 0.5,
    furni: 0.5,
    trax: 0.5
}) as Readonly<ISoundVolumesSnapshot>;

const subscribeTo =
    (eventType: string) =>
    (onChange: () => void): (() => void) => {
        const dispatcher = GetEventDispatcher();

        // Stale renderer (no v2.1.0 subscribe API) — return a no-op
        // unsubscribe so useSyncExternalStore stays mounted cleanly.
        if (!dispatcher || typeof dispatcher.subscribe !== 'function') return NOOP_UNSUBSCRIBE;

        return dispatcher.subscribe(eventType, onChange);
    };

export const useUserDataSnapshot = (): Readonly<IUserDataSnapshot> =>
    useExternalSnapshot(subscribeTo(OctaneEventType.SESSION_DATA_UPDATED), () => {
        const manager = GetSessionDataManager();

        if (!manager || typeof manager.getUserDataSnapshot !== 'function') return DEFAULT_USER_DATA;

        return manager.getUserDataSnapshot();
    });

export const useActiveRoomSessionSnapshot = (): Readonly<IRoomSessionSnapshot> | null =>
    useExternalSnapshot(subscribeTo(OctaneEventType.ROOM_SESSION_UPDATED), () => {
        const manager = GetRoomSessionManager();

        if (!manager || typeof manager.getActiveRoomSessionSnapshot !== 'function') return null;

        return manager.getActiveRoomSessionSnapshot();
    });

export const useIgnoredUsersSnapshot = (): ReadonlyArray<string> =>
    useExternalSnapshot(subscribeTo(OctaneEventType.IGNORED_USERS_UPDATED), () => {
        const inner = GetSessionDataManager()?.ignoredUsersManager;

        if (!inner || typeof inner.getIgnoredUsersSnapshot !== 'function') return EMPTY_IGNORED_LIST;

        return inner.getIgnoredUsersSnapshot();
    });

/**
 * Reactive predicate built on top of `useIgnoredUsersSnapshot`.
 * Re-renders only when the array reference flips (i.e. someone is added
 * or removed) — not on unrelated session updates.
 */
export const useIsUserIgnored = (name: string): boolean => {
    const list = useIgnoredUsersSnapshot();

    return useMemo(() => list.includes(name), [list, name]);
};

/**
 * Reactive view of the current user's rank metadata — name, badge,
 * prefix, prefix color — mirrored from `permission_ranks` via the
 * extended `UserPermissionsComposer` wire (Arcturus ≥ 4.2.10). Use
 * this in PRESENTATIONAL code only (chat prefix coloring, badge in
 * the avatar overlay, "rank" line in the user profile). DO NOT use
 * it for gating UI capabilities: prefer the permission-based family
 * (`useHasPermission(key)`) below, which is dynamic against
 * `permission_definitions` and survives rank renumbering.
 */
export interface IUserRank {
    readonly id: number;
    readonly name: string;
    readonly level: number;
    readonly badge: string;
    readonly prefix: string;
    readonly prefixColor: string;
}

export const useUserRank = (): IUserRank => {
    const userData = useUserDataSnapshot();

    return useMemo<IUserRank>(
        () => ({
            id: userData.rankId,
            name: userData.rankName,
            level: userData.securityLevel,
            badge: userData.rankBadge,
            prefix: userData.rankPrefix,
            prefixColor: userData.rankPrefixColor
        }),
        [userData.rankId, userData.rankName, userData.securityLevel, userData.rankBadge, userData.rankPrefix, userData.rankPrefixColor]
    );
};

/**
 * Resolved permission map for the current user, mirroring
 * `permission_definitions` filtered to the user's rank. Backed by
 * `SessionDataManager.getPermissionsSnapshot()` and invalidated by
 * `USER_PERMISSIONS_UPDATED` (Arcturus dispatches the underlying
 * packet at login + after every `setRank`).
 *
 * Values: 1 = ALLOWED, 2 = ROOM_OWNER (legacy gate that requires
 * the user to also be the room owner). Absent key = DISALLOWED.
 *
 * Empty Map when the connected emulator doesn't ship the extension
 * (older deployments) — `useHasPermission` then returns false for
 * every key, which hides mod-only UI by default (safe).
 */
export const useUserPermissions = (): ReadonlyMap<string, number> =>
    useExternalSnapshot(subscribeTo(OctaneEventType.USER_PERMISSIONS_UPDATED), () => {
        const manager = GetSessionDataManager();

        if (!manager || typeof manager.getPermissionsSnapshot !== 'function') return EMPTY_PERMISSIONS;

        return manager.getPermissionsSnapshot();
    });

/**
 * Reactive predicate: does the current user have the named
 * permission **unconditionally** (ALLOWED only)? `key` must match a
 * row in `permission_definitions.permission_key` (e.g.
 * `'acc_supporttool'`, `'acc_anyroomowner'`, `'acc_catalogfurni'`).
 *
 * Mirrors the server-side semantics of `Habbo.hasPermission(key)`
 * (PermissionsManager → `Rank.hasPermission(key, isRoomOwner=false)`
 * which returns `setting == ALLOWED` — `setting == ROOM_OWNER`
 * requires the call site to pass `isRoomOwner=true`, which the
 * client doesn't have ambiently). So this hook returns `true`
 * only for ALLOWED (value 1) and `false` for ROOM_OWNER (value 2)
 * — the latter has to be re-checked against the active room
 * ownership via `usePermissionValue(key) === 2 && roomSession.isRoomOwner`.
 *
 * Prefer this over any rank-based gate — it survives rank
 * renumbering and adding new ranks without touching the React code.
 */
export const useHasPermission = (key: string): boolean => {
    const permissions = useUserPermissions();

    return useMemo(() => permissions.get(key) === 1, [permissions, key]);
};

/**
 * Reactive raw permission value:
 *   0 = DISALLOWED (also returned for absent keys)
 *   1 = ALLOWED
 *   2 = ROOM_OWNER (granted only when the caller is the active
 *       room owner — combine with `roomSession.isRoomOwner`)
 *
 * Use this when the gate needs to distinguish ROOM_OWNER from
 * plain ALLOWED, or for the handful of permissions whose
 * `permission_definitions.max_value > 1`.
 */
export const usePermissionValue = (key: string): number => {
    const permissions = useUserPermissions();

    return useMemo(() => permissions.get(key) ?? 0, [permissions, key]);
};

/**
 * Reactive ambassador flag. Alias of
 * `useHasPermission('acc_ambassador')` — the snapshot also carries
 * an explicit `isAmbassador` boolean (legacy
 * `UserPermissionsComposer` field), but routing it through the
 * permission map keeps a single source of truth for runtime
 * promote/demote.
 */
export const useIsAmbassador = (): boolean => useHasPermission('acc_ambassador');

export const useGroupBadgesSnapshot = (): ReadonlyMap<number, string> =>
    useExternalSnapshot(subscribeTo(OctaneEventType.GROUP_BADGES_UPDATED), () => {
        const inner = GetSessionDataManager()?.groupInformationManager;

        if (!inner || typeof inner.getGroupBadgesSnapshot !== 'function') return EMPTY_GROUP_BADGES;

        return inner.getGroupBadgesSnapshot();
    });

/**
 * Returns the badge id for a given group, reactive. Empty string when
 * the badge isn't known (matches the legacy `getGroupBadge` fallback).
 */
export const useGroupBadge = (groupId: number): string => {
    const badges = useGroupBadgesSnapshot();

    return useMemo(() => badges.get(groupId) ?? '', [badges, groupId]);
};

export const useVolumesSnapshot = (): Readonly<ISoundVolumesSnapshot> =>
    useExternalSnapshot(subscribeTo(OctaneEventType.SOUND_VOLUMES_UPDATED), () => {
        const manager = GetSoundManager();

        if (!manager || typeof manager.getVolumesSnapshot !== 'function') return DEFAULT_VOLUMES;

        return manager.getVolumesSnapshot();
    });

/**
 * Returns the active room's user list, reactive. Returns an empty
 * frozen array when no room session is active (or when the renderer
 * doesn't expose the snapshot getter yet).
 *
 * Subscribes to BOTH `ROOM_USER_LIST_UPDATED` (join/leave/update inside
 * the active session) AND `ROOM_SESSION_UPDATED` (because the underlying
 * `userDataManager` reference flips when the active room changes).
 */
export const useRoomUserListSnapshot = (): ReadonlyArray<IRoomUserData> =>
    useExternalSnapshot(
        (onChange) => {
            const dispatcher = GetEventDispatcher();

            if (!dispatcher || typeof dispatcher.subscribe !== 'function') return NOOP_UNSUBSCRIBE;

            const offList = dispatcher.subscribe(OctaneEventType.ROOM_USER_LIST_UPDATED, onChange);
            const offSession = dispatcher.subscribe(OctaneEventType.ROOM_SESSION_UPDATED, onChange);

            return () => {
                offList();
                offSession();
            };
        },
        () => {
            const userDataManager = GetRoomSessionManager()?.getActiveRoomSessionSnapshot?.()?.session?.userDataManager;

            if (!userDataManager || typeof userDataManager.getRoomUserListSnapshot !== 'function') return EMPTY_USER_LIST;

            return userDataManager.getRoomUserListSnapshot();
        }
    );
