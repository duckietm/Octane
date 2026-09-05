import {
    HabboSearchComposer,
    HabboSearchResultEvent,
    HousekeepingActionLogEvent,
    HousekeepingActionResultEvent,
    HousekeepingBanUserComposer,
    HousekeepingDashboardEvent,
    HousekeepingDeleteRoomComposer,
    HousekeepingFindRoomByIdComposer,
    HousekeepingFindUserByIdComposer,
    HousekeepingFindUserByNameComposer,
    HousekeepingForceDisconnectUserComposer,
    HousekeepingGetDashboardComposer,
    HousekeepingGiveCreditsComposer,
    HousekeepingGiveCurrencyComposer,
    HousekeepingGrantItemComposer,
    HousekeepingKickAllFromRoomComposer,
    HousekeepingKickUserComposer,
    HousekeepingListActionLogComposer,
    HousekeepingMuteRoomComposer,
    HousekeepingMuteUserComposer,
    HousekeepingResetUserPasswordComposer,
    HousekeepingRoomData,
    HousekeepingRoomDetailEvent,
    HousekeepingRoomListEvent,
    HousekeepingRoomStateComposer,
    HousekeepingSearchRoomsComposer,
    HousekeepingSendHotelAlertComposer,
    HousekeepingSetHcSubscriptionComposer,
    HousekeepingSetUserRankComposer,
    HousekeepingTradeLockUserComposer,
    HousekeepingTransferRoomOwnershipComposer,
    HousekeepingUnbanUserComposer,
    HousekeepingUserDetailData,
    HousekeepingUserDetailEvent,
    IMessageComposer
} from '@octane/renderer';
import { awaitMessageEvent } from '../octane/awaitMessageEvent';
import { SendMessageComposer } from '../octane/SendMessageComposer';
import {
    IHousekeepingActionLogEntry,
    IHousekeepingActionResult,
    IHousekeepingDashboard,
    IHousekeepingRoom,
    IHousekeepingRoomSummary,
    IHousekeepingUser,
    IHousekeepingUserSummary
} from './IHousekeepingTypes';

const USER_SEARCH_LIMIT = 8;

const searchUsersViaPacket = async (prefix: string, signal?: AbortSignal): Promise<IHousekeepingUserSummary[]> => {
    SendMessageComposer(new HabboSearchComposer(prefix));

    // Snapshot the parser inside the subscribe callback — the renderer
    // recycles parser instances after the callback returns, so any
    // post-await read of `event.getParser()` comes back null.
    return await awaitMessageEvent<HabboSearchResultEvent, IHousekeepingUserSummary[]>(HabboSearchResultEvent, {
        signal,
        timeoutMs: 8_000,
        select: (event) => {
            const parser = event.getParser();

            if (!parser) return [];

            const combined = [...parser.friends, ...parser.others];
            const summaries: IHousekeepingUserSummary[] = [];

            for (const entry of combined) {
                const username = entry.avatarName || '';

                if (!username.toLowerCase().startsWith(prefix.toLowerCase())) continue;

                summaries.push({
                    id: entry.avatarId,
                    username,
                    figure: entry.avatarFigure || '',
                    online: entry.isAvatarOnline === true,
                    rank: 0
                });

                if (summaries.length >= USER_SEARCH_LIMIT) break;
            }

            return summaries;
        }
    });
};

const mapUserDetail = (user: HousekeepingUserDetailData): IHousekeepingUser => ({
    id: user.id,
    username: user.username,
    motto: user.motto,
    figure: user.figure,
    rank: user.rank,
    rankName: user.rankName,
    online: user.online,
    lastOnlineAt: user.lastOnlineAt > 0 ? user.lastOnlineAt : null,
    creditsBalance: user.creditsBalance,
    ducketsBalance: user.ducketsBalance,
    diamondsBalance: user.diamondsBalance,
    email: user.email,
    ipLast: user.ipLast,
    isBanned: user.isBanned,
    isMuted: user.isMuted,
    isTradeLocked: user.isTradeLocked
});

const awaitUserDetail = (): Promise<IHousekeepingUser | null> =>
    awaitMessageEvent<HousekeepingUserDetailEvent, IHousekeepingUser | null>(HousekeepingUserDetailEvent, {
        timeoutMs: 8_000,
        select: (event) => {
            const parser = event.getParser();

            if (!parser || !parser.found || !parser.user) return null;

            return mapUserDetail(parser.user);
        }
    });

const findUserByNameViaPacket = async (username: string): Promise<IHousekeepingUser | null> => {
    const trimmed = (username || '').trim();

    if (!trimmed) return null;

    SendMessageComposer(new HousekeepingFindUserByNameComposer(trimmed));

    return awaitUserDetail();
};

const findUserByIdViaPacket = async (userId: number): Promise<IHousekeepingUser | null> => {
    if (!Number.isFinite(userId) || userId <= 0) return null;

    SendMessageComposer(new HousekeepingFindUserByIdComposer(userId));

    return awaitUserDetail();
};

/**
 * Fire any HK action composer and resolve when the matching
 * HousekeepingActionResultEvent arrives. The server tags each ack with
 * a string `actionKey` (`user.ban`, `user.mute`, …) so the listener can
 * filter via the `accept` predicate — protects against another concurrent
 * action's ack slipping into a waiter that was expecting a different one.
 */
const runHkAction = async (composer: IMessageComposer<unknown[]>, expectedActionKey: string, timeoutMs = 15_000): Promise<IHousekeepingActionResult> => {
    SendMessageComposer(composer);

    try {
        return await awaitMessageEvent<HousekeepingActionResultEvent, IHousekeepingActionResult>(HousekeepingActionResultEvent, {
            timeoutMs,
            accept: (e) => e.getParser()?.actionKey === expectedActionKey,
            select: (event) => {
                const parser = event.getParser();

                if (!parser) return { ok: false, actionId: null, message: 'no_parser' };

                return {
                    ok: parser.ok,
                    actionId: parser.actionId > 0 ? parser.actionId : null,
                    message: parser.message
                };
            }
        });
    } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown';

        return { ok: false, actionId: null, message: reason };
    }
};

const banUserViaPacket = (userId: number, reason: string, hours: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingBanUserComposer(userId, reason || '', hours), 'user.ban');

const unbanUserViaPacket = (userId: number): Promise<IHousekeepingActionResult> => runHkAction(new HousekeepingUnbanUserComposer(userId), 'user.unban');

const muteUserViaPacket = (userId: number, reason: string, minutes: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingMuteUserComposer(userId, reason || '', minutes), 'user.mute');

const kickUserViaPacket = (userId: number, reason: string): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingKickUserComposer(userId, reason || ''), 'user.kick');

const forceDisconnectUserViaPacket = (userId: number, reason: string): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingForceDisconnectUserComposer(userId, reason || ''), 'user.disconnect');

const setUserRankViaPacket = (userId: number, rank: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingSetUserRankComposer(userId, rank), 'user.set_rank');

const tradeLockUserViaPacket = (userId: number, hours: number, reason: string): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingTradeLockUserComposer(userId, hours, reason || ''), 'user.trade_lock');

const resetUserPasswordViaPacket = (userId: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingResetUserPasswordComposer(userId), 'user.reset_password');

const mapRoom = (room: HousekeepingRoomData): IHousekeepingRoom => ({
    id: room.id,
    name: room.name,
    description: room.description,
    ownerId: room.ownerId,
    ownerName: room.ownerName,
    userCount: room.userCount,
    maxUsers: room.maxUsers,
    isLocked: room.isLocked,
    isMuted: room.isMuted,
    isPublic: room.isPublic,
    createdAt: room.createdAt
});

const findRoomByIdViaPacket = (roomId: number): Promise<IHousekeepingRoom | null> => {
    if (!Number.isFinite(roomId) || roomId <= 0) return Promise.resolve(null);

    SendMessageComposer(new HousekeepingFindRoomByIdComposer(roomId));

    return awaitMessageEvent<HousekeepingRoomDetailEvent, IHousekeepingRoom | null>(HousekeepingRoomDetailEvent, {
        timeoutMs: 8_000,
        select: (event) => {
            const parser = event.getParser();

            if (!parser || !parser.found || !parser.room) return null;

            return mapRoom(parser.room);
        }
    });
};

const findRoomByNameViaPacket = (name: string): Promise<IHousekeepingRoom[]> => {
    const trimmed = (name || '').trim();

    if (!trimmed) return Promise.resolve([]);

    SendMessageComposer(new HousekeepingSearchRoomsComposer(trimmed, true, 50));

    return awaitMessageEvent<HousekeepingRoomListEvent, IHousekeepingRoom[]>(HousekeepingRoomListEvent, {
        timeoutMs: 8_000,
        select: (event) => event.getParser()?.rooms.map(mapRoom) ?? []
    });
};

const searchRoomsViaPacket = (prefix: string, signal?: AbortSignal): Promise<IHousekeepingRoomSummary[]> => {
    const trimmed = (prefix || '').trim();

    if (!trimmed) return Promise.resolve([]);

    SendMessageComposer(new HousekeepingSearchRoomsComposer(trimmed, false, 8));

    return awaitMessageEvent<HousekeepingRoomListEvent, IHousekeepingRoomSummary[]>(HousekeepingRoomListEvent, {
        signal,
        timeoutMs: 8_000,
        select: (event) =>
            event.getParser()?.rooms.map((room) => ({
                id: room.id,
                name: room.name,
                userCount: room.userCount,
                ownerName: room.ownerName
            })) ?? []
    });
};

const setRoomStateViaPacket = (roomId: number, open: boolean): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingRoomStateComposer(roomId, open), open ? 'room.open' : 'room.close');

const muteRoomViaPacket = (roomId: number, minutes: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingMuteRoomComposer(roomId, minutes), 'room.mute');

const kickAllFromRoomViaPacket = (roomId: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingKickAllFromRoomComposer(roomId), 'room.kick_all');

const transferRoomOwnershipViaPacket = (roomId: number, newOwnerId: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingTransferRoomOwnershipComposer(roomId, newOwnerId), 'room.transfer');

const deleteRoomViaPacket = (roomId: number): Promise<IHousekeepingActionResult> => runHkAction(new HousekeepingDeleteRoomComposer(roomId), 'room.delete');

const CURRENCY_DUCKETS = 0;
const CURRENCY_DIAMONDS = 5;

const giveCreditsViaPacket = (userId: number, amount: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingGiveCreditsComposer(userId, amount), 'user.give_credits');

const giveDucketsViaPacket = (userId: number, amount: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingGiveCurrencyComposer(userId, CURRENCY_DUCKETS, amount), `user.give_currency_${CURRENCY_DUCKETS}`);

const giveDiamondsViaPacket = (userId: number, amount: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingGiveCurrencyComposer(userId, CURRENCY_DIAMONDS, amount), `user.give_currency_${CURRENCY_DIAMONDS}`);

const grantItemViaPacket = (userId: number, itemId: number, quantity: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingGrantItemComposer(userId, itemId, quantity), 'user.grant_item');

const setHcSubscriptionViaPacket = (userId: number, days: number): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingSetHcSubscriptionComposer(userId, days), 'user.set_hc');

const sendHotelAlertViaPacket = (message: string): Promise<IHousekeepingActionResult> =>
    runHkAction(new HousekeepingSendHotelAlertComposer(message || ''), 'hotel.alert');

const EMPTY_DASHBOARD: IHousekeepingDashboard = {
    onlineUsers: 0,
    totalUsers: 0,
    activeRooms: 0,
    totalRooms: 0,
    peakOnlineToday: 0,
    peakOnlineAllTime: 0,
    pendingTickets: 0,
    sanctionsLast24h: 0,
    serverUptimeSeconds: 0,
    serverVersion: ''
};

const getDashboardViaPacket = (signal?: AbortSignal): Promise<IHousekeepingDashboard> => {
    SendMessageComposer(new HousekeepingGetDashboardComposer());

    return awaitMessageEvent<HousekeepingDashboardEvent, IHousekeepingDashboard>(HousekeepingDashboardEvent, {
        signal,
        timeoutMs: 10_000,
        select: (event) => {
            const parser = event.getParser();

            if (!parser) return EMPTY_DASHBOARD;

            return {
                onlineUsers: parser.onlineUsers,
                totalUsers: parser.totalUsers,
                activeRooms: parser.activeRooms,
                totalRooms: parser.totalRooms,
                peakOnlineToday: parser.peakOnlineToday,
                peakOnlineAllTime: parser.peakOnlineAllTime,
                pendingTickets: parser.pendingTickets,
                sanctionsLast24h: parser.sanctionsLast24h,
                serverUptimeSeconds: parser.serverUptimeSeconds,
                serverVersion: parser.serverVersion
            };
        }
    });
};

const listActionLogViaPacket = (limit: number, signal?: AbortSignal): Promise<IHousekeepingActionLogEntry[]> => {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit || 50)));

    SendMessageComposer(new HousekeepingListActionLogComposer(safeLimit));

    return awaitMessageEvent<HousekeepingActionLogEvent, IHousekeepingActionLogEntry[]>(HousekeepingActionLogEvent, {
        signal,
        timeoutMs: 10_000,
        select: (event) =>
            event.getParser()?.entries.map((entry) => ({
                id: entry.id,
                timestamp: entry.timestamp,
                actorId: entry.actorId,
                actorName: entry.actorName,
                targetType: entry.targetType === 'room' || entry.targetType === 'hotel' ? entry.targetType : 'user',
                targetId: entry.targetId > 0 ? entry.targetId : null,
                targetLabel: entry.targetLabel,
                action: entry.action,
                detail: entry.detail,
                success: entry.success
            })) ?? []
    });
};

export const HousekeepingApi = {
    // -- dashboard -------------------------------------------------
    getDashboard: (signal?: AbortSignal) => getDashboardViaPacket(signal),

    // -- user lookup -----------------------------------------------
    findUserByName: (username: string) => findUserByNameViaPacket(username),
    findUserById: (userId: number) => findUserByIdViaPacket(userId),
    searchUsers: (prefix: string, signal?: AbortSignal) => searchUsersViaPacket(prefix, signal),

    // -- user actions ----------------------------------------------
    banUser: (userId: number, reason: string, hours: number) => banUserViaPacket(userId, reason, hours),
    unbanUser: (userId: number) => unbanUserViaPacket(userId),
    muteUser: (userId: number, reason: string, minutes: number) => muteUserViaPacket(userId, reason, minutes),
    kickUser: (userId: number, reason: string) => kickUserViaPacket(userId, reason),
    forceDisconnectUser: (userId: number, reason: string) => forceDisconnectUserViaPacket(userId, reason),
    resetUserPassword: (userId: number) => resetUserPasswordViaPacket(userId),
    setUserRank: (userId: number, rank: number) => setUserRankViaPacket(userId, rank),
    tradeLockUser: (userId: number, hours: number, reason: string) => tradeLockUserViaPacket(userId, hours, reason),

    // -- room lookup -----------------------------------------------
    findRoomById: (roomId: number) => findRoomByIdViaPacket(roomId),
    findRoomByName: (name: string) => findRoomByNameViaPacket(name),
    searchRooms: (prefix: string, signal?: AbortSignal) => searchRoomsViaPacket(prefix, signal),

    // -- room actions ----------------------------------------------
    openRoom: (roomId: number) => setRoomStateViaPacket(roomId, true),
    closeRoom: (roomId: number) => setRoomStateViaPacket(roomId, false),
    muteRoom: (roomId: number, minutes: number) => muteRoomViaPacket(roomId, minutes),
    kickAllFromRoom: (roomId: number) => kickAllFromRoomViaPacket(roomId),
    transferRoomOwnership: (roomId: number, newOwnerId: number) => transferRoomOwnershipViaPacket(roomId, newOwnerId),
    deleteRoom: (roomId: number) => deleteRoomViaPacket(roomId),

    // -- economy actions -------------------------------------------
    giveCredits: (userId: number, amount: number) => giveCreditsViaPacket(userId, amount),
    giveDuckets: (userId: number, amount: number) => giveDucketsViaPacket(userId, amount),
    giveDiamonds: (userId: number, amount: number) => giveDiamondsViaPacket(userId, amount),
    grantItem: (userId: number, itemId: number, quantity: number) => grantItemViaPacket(userId, itemId, quantity),
    setHcSubscription: (userId: number, days: number) => setHcSubscriptionViaPacket(userId, days),

    // -- hotel-level -----------------------------------------------
    sendHotelAlert: (message: string) => sendHotelAlertViaPacket(message),
    listActionLog: (limit: number, signal?: AbortSignal) => listActionLogViaPacket(limit, signal)
} as const;
