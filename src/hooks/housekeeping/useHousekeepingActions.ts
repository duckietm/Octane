import { useCallback } from 'react';
import {
    GetRoomSession,
    HousekeepingApi,
    HousekeepingErrorKey,
    HousekeepingReloadTarget,
    IHousekeepingActionResult,
    IHousekeepingRoomSettingsInput,
    LocalizeText,
    NotificationBubbleType,
    validateAmount,
    validateBanHours,
    validatePositiveId,
    validateRank,
    validateReason,
    validateRoomSettings
} from '../../api';
import { useNotification } from '../notification';
import { useHousekeepingStore } from './useHousekeepingStore';

const SUCCESS_KEY = 'housekeeping.action.success';
const ERROR_KEY = 'housekeeping.action.error';

type ToastFn = (message: string, type: string, imageUrl?: string, internalLink?: string, senderName?: string) => void;

const localizeOrPassthrough = (key: string): string => {
    if (!key) return '';
    if (!key.includes('.')) return key;

    const localized = LocalizeText(key);

    return localized === key ? key : localized;
};

const wrap = async (
    runner: () => Promise<IHousekeepingActionResult>,
    markPending: () => void,
    markDone: (errorKey: string | null, successKey: string | null) => void,
    toast: ToastFn,
    recordMetric: (action: string, latencyMs: number, isError: boolean) => void,
    actionLabel: string
): Promise<IHousekeepingActionResult | null> => {
    markPending();

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const measure = (isError: boolean) => {
        const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

        recordMetric(actionLabel, endedAt - startedAt, isError);
    };

    try {
        const result = await runner();

        if (result && result.ok === false) {
            // Error path: status banner only — the banner is inline
            // and stays put until dismissed, more visible than a
            // transient bubble for a failure that needs operator
            // attention.
            markDone(result.message || ERROR_KEY, null);
            measure(true);

            return result;
        }

        const successKey = result?.message || SUCCESS_KEY;

        markDone(null, successKey);
        // Success path also fires a transient toast so the operator
        // gets feedback without scanning the banner — banner stays
        // as a fallback for users that have bubbles disabled.
        toast(localizeOrPassthrough(successKey), NotificationBubbleType.INFO);
        measure(false);

        return result;
    } catch (error) {
        markDone(String((error as Error)?.message ?? error), null);
        measure(true);

        return null;
    }
};

const validationOr = (key: HousekeepingErrorKey, markDone: (e: string | null, s: string | null) => void): boolean => {
    if (key === HousekeepingErrorKey.NONE) return true;

    markDone(`housekeeping.validation.${key}`, null);

    return false;
};

/**
 * Imperative facade for every HK admin action. State (selected
 * user/room, status banner) lives in `useHousekeepingStore`; this
 * hook reads it for context (e.g. the currently-selected target)
 * and writes only the action-pending / status flags via
 * `markActionPending` / `markActionDone`. Keeping the read-only
 * state in a separate filter would still work, but the singleton
 * store keeps invocation simple for the panel views that already
 * pull state via `useHousekeepingStore`.
 */
export const useHousekeepingActions = () => {
    const { selectedUser, selectedRoom, markActionPending, markActionDone, setSelectedUser, setSelectedRoom, recordActionMetric, revealPassword } =
        useHousekeepingStore();
    const { showSingleBubble } = useNotification();
    // Stable closure-bound runner so every action below stays a
    // one-liner: only the runner thunk + a per-action telemetry
    // label change per call site. The label keys into the metrics
    // map; a missing label defaults to "anonymous" so untagged calls
    // still produce a metric row.
    const runAction = useCallback(
        (runner: () => Promise<IHousekeepingActionResult>, actionLabel: string = 'anonymous') =>
            wrap(runner, markActionPending, markActionDone, showSingleBubble, recordActionMetric, actionLabel),
        [markActionPending, markActionDone, showSingleBubble, recordActionMetric]
    );

    // -- USER --------------------------------------------------------
    const banUser = useCallback(
        async (userId: number, reason: string, hours: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateReason(reason), markActionDone)) return null;
            if (!validationOr(validateBanHours(hours), markActionDone)) return null;

            return runAction(() => HousekeepingApi.banUser(userId, reason, hours), 'banUser');
        },
        [runAction, markActionDone]
    );

    const unbanUser = useCallback(
        async (userId: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;

            return runAction(() => HousekeepingApi.unbanUser(userId), 'unbanUser');
        },
        [runAction, markActionDone]
    );

    const muteUser = useCallback(
        async (userId: number, reason: string, minutes: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateReason(reason), markActionDone)) return null;
            if (!validationOr(validateBanHours(minutes), markActionDone)) return null;

            return runAction(() => HousekeepingApi.muteUser(userId, reason, minutes), 'muteUser');
        },
        [runAction, markActionDone]
    );

    const kickUser = useCallback(
        async (userId: number, reason: string) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateReason(reason), markActionDone)) return null;

            return runAction(() => HousekeepingApi.kickUser(userId, reason), 'kickUser');
        },
        [runAction, markActionDone]
    );

    const forceDisconnectUser = useCallback(
        async (userId: number, reason: string) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateReason(reason), markActionDone)) return null;

            return runAction(() => HousekeepingApi.forceDisconnectUser(userId, reason), 'forceDisconnectUser');
        },
        [runAction, markActionDone]
    );

    const resetUserPassword = useCallback(
        async (userId: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;

            // Run the action with a localizable success message — we
            // INTERCEPT before `wrap`'s default behavior leaks the plaintext
            // into the auto-dismissing status banner. The emulator returns
            // the freshly-generated plaintext in `result.message`; we lift it
            // into the dedicated `passwordReveal` slot which renders a
            // persistent card with a copy button. The wrapping `runAction`
            // would also fire a transient toast with whatever string lands
            // in `message`, so we bypass it via a direct API call + manual
            // status writes here.
            const username = selectedUser && selectedUser.id === userId ? selectedUser.username : '';

            markActionPending();
            const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const measure = (isError: boolean) => {
                const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
                recordActionMetric('resetUserPassword', endedAt - startedAt, isError);
            };

            try {
                const result = await HousekeepingApi.resetUserPassword(userId);

                if (!result || result.ok === false) {
                    markActionDone(result?.message || 'housekeeping.action.error', null);
                    measure(true);
                    return result ?? null;
                }

                const plaintext = result.message ?? '';

                if (plaintext) revealPassword(userId, username, plaintext);

                // Generic success key — does NOT include the plaintext, so
                // even if the banner is visible the password isn't in it.
                markActionDone(null, 'housekeeping.action.reset_password.done');
                measure(false);
                return result;
            } catch (error) {
                markActionDone(String((error as Error)?.message ?? error), null);
                measure(true);
                return null;
            }
        },
        [markActionPending, markActionDone, selectedUser, revealPassword, recordActionMetric]
    );

    const setUserRank = useCallback(
        async (userId: number, rank: number, durationSeconds = 0) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateRank(rank), markActionDone)) return null;

            const result = await runAction(() => HousekeepingApi.setUserRank(userId, rank, durationSeconds), 'setUserRank');

            if (result && result.ok !== false && selectedUser && selectedUser.id === userId) {
                setSelectedUser({ ...selectedUser, rank });
            }

            return result;
        },
        [runAction, markActionDone, selectedUser, setSelectedUser]
    );

    const tradeLockUser = useCallback(
        async (userId: number, hours: number, reason: string) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateReason(reason), markActionDone)) return null;
            if (!validationOr(validateBanHours(hours), markActionDone)) return null;

            return runAction(() => HousekeepingApi.tradeLockUser(userId, hours, reason), 'tradeLockUser');
        },
        [runAction, markActionDone]
    );

    // -- ROOM --------------------------------------------------------
    const openRoom = useCallback(
        async (roomId: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;

            const result = await runAction(() => HousekeepingApi.openRoom(roomId), 'openRoom');

            if (result && result.ok !== false && selectedRoom && selectedRoom.id === roomId) {
                setSelectedRoom({ ...selectedRoom, isLocked: false, settings: selectedRoom.settings ? { ...selectedRoom.settings, state: 0 } : null });
            }

            return result;
        },
        [runAction, markActionDone, selectedRoom, setSelectedRoom]
    );

    const closeRoom = useCallback(
        async (roomId: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;

            const result = await runAction(() => HousekeepingApi.closeRoom(roomId), 'closeRoom');

            if (result && result.ok !== false && selectedRoom && selectedRoom.id === roomId) {
                setSelectedRoom({ ...selectedRoom, isLocked: true, settings: selectedRoom.settings ? { ...selectedRoom.settings, state: 1 } : null });
            }

            return result;
        },
        [runAction, markActionDone, selectedRoom, setSelectedRoom]
    );

    const saveRoomSettings = useCallback(
        async (roomId: number, input: IHousekeepingRoomSettingsInput) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;
            if (!validationOr(validateRoomSettings(input), markActionDone)) return null;

            const result = await runAction(() => HousekeepingApi.saveRoomSettings(roomId, input), 'saveRoomSettings');

            if (result && result.ok !== false && selectedRoom && selectedRoom.id === roomId) {
                setSelectedRoom({
                    ...selectedRoom,
                    name: input.name,
                    description: input.description,
                    maxUsers: input.maxUsers,
                    settings: {
                        state: selectedRoom.settings?.state ?? (selectedRoom.isLocked ? 1 : 0),
                        categoryId: input.categoryId,
                        tradeMode: input.tradeMode,
                        tags: input.tags
                    }
                });
            }

            return result;
        },
        [runAction, markActionDone, selectedRoom, setSelectedRoom]
    );

    const muteRoom = useCallback(
        async (roomId: number, minutes: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;
            if (!validationOr(validateBanHours(minutes), markActionDone)) return null;

            return runAction(() => HousekeepingApi.muteRoom(roomId, minutes), 'muteRoom');
        },
        [runAction, markActionDone]
    );

    const kickAllFromRoom = useCallback(
        async (roomId: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;

            return runAction(() => HousekeepingApi.kickAllFromRoom(roomId), 'kickAllFromRoom');
        },
        [runAction, markActionDone]
    );

    const transferRoomOwnership = useCallback(
        async (roomId: number, newOwnerId: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;
            if (!validationOr(validatePositiveId(newOwnerId, 'user'), markActionDone)) return null;

            return runAction(() => HousekeepingApi.transferRoomOwnership(roomId, newOwnerId), 'transferRoomOwnership');
        },
        [runAction, markActionDone]
    );

    const deleteRoom = useCallback(
        async (roomId: number) => {
            if (!validationOr(validatePositiveId(roomId, 'room'), markActionDone)) return null;

            const result = await runAction(() => HousekeepingApi.deleteRoom(roomId), 'deleteRoom');

            if (result && result.ok !== false && selectedRoom && selectedRoom.id === roomId) {
                setSelectedRoom(null);
            }

            return result;
        },
        [runAction, markActionDone, selectedRoom, setSelectedRoom]
    );

    // -- ECONOMY -----------------------------------------------------
    const giveCredits = useCallback(
        async (userId: number, amount: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateAmount(amount), markActionDone)) return null;

            return runAction(() => HousekeepingApi.giveCredits(userId, amount), 'giveCredits');
        },
        [runAction, markActionDone]
    );

    const giveDuckets = useCallback(
        async (userId: number, amount: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateAmount(amount), markActionDone)) return null;

            return runAction(() => HousekeepingApi.giveDuckets(userId, amount), 'giveDuckets');
        },
        [runAction, markActionDone]
    );

    const giveDiamonds = useCallback(
        async (userId: number, amount: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateAmount(amount), markActionDone)) return null;

            return runAction(() => HousekeepingApi.giveDiamonds(userId, amount), 'giveDiamonds');
        },
        [runAction, markActionDone]
    );

    const grantItem = useCallback(
        async (userId: number, itemId: number, quantity: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validatePositiveId(itemId, 'user'), markActionDone)) return null;
            if (!validationOr(validateAmount(quantity), markActionDone)) return null;

            return runAction(() => HousekeepingApi.grantItem(userId, itemId, quantity), 'grantItem');
        },
        [runAction, markActionDone]
    );

    const setHcSubscription = useCallback(
        async (userId: number, days: number) => {
            if (!validationOr(validatePositiveId(userId, 'user'), markActionDone)) return null;
            if (!validationOr(validateAmount(days), markActionDone)) return null;

            return runAction(() => HousekeepingApi.setHcSubscription(userId, days), 'setHcSubscription');
        },
        [runAction, markActionDone]
    );

    const sendHotelAlert = useCallback(
        async (message: string, recipient?: string) => {
            if (!validationOr(validateReason(message), markActionDone)) return null;

            return runAction(() => HousekeepingApi.sendHotelAlert(message, recipient), 'sendHotelAlert');
        },
        [runAction, markActionDone]
    );

    const startMaintenance = useCallback(
        (minutes: number, message: string) => runAction(() => HousekeepingApi.maintenance('start', message, minutes), 'startMaintenance'),
        [runAction]
    );

    const cancelMaintenance = useCallback(() => runAction(() => HousekeepingApi.maintenance('cancel'), 'cancelMaintenance'), [runAction]);

    const disableMaintenance = useCallback(() => runAction(() => HousekeepingApi.maintenance('disable'), 'disableMaintenance'), [runAction]);

    const addFilterWord = useCallback(
        (word: string, replacement: string) => runAction(() => HousekeepingApi.wordFilter('add', word, replacement), 'addFilterWord'),
        [runAction]
    );

    const setLockdown = useCallback((enabled: boolean) => runAction(() => HousekeepingApi.setLockdown(enabled), 'setLockdown'), [runAction]);

    const setPermission = useCallback(
        (permissionKey: string, rankId: number, value: number) =>
            runAction(() => HousekeepingApi.setPermission(permissionKey, rankId, value), 'setPermission'),
        [runAction]
    );

    const addUserNote = useCallback((userId: number, note: string) => runAction(() => HousekeepingApi.userNote('add', userId, 0, note), 'addUserNote'), [runAction]);

    const deleteUserNote = useCallback(
        (userId: number, noteId: number) => runAction(() => HousekeepingApi.userNote('delete', userId, noteId), 'deleteUserNote'),
        [runAction]
    );

    const removeFilterWord = useCallback((word: string) => runAction(() => HousekeepingApi.wordFilter('remove', word), 'removeFilterWord'), [runAction]);

    const revokeBan = useCallback(
        async (banId: number) => {
            if (!Number.isInteger(banId) || banId <= 0) return null;

            return runAction(() => HousekeepingApi.revokeBan(banId), 'revokeBan');
        },
        [runAction]
    );

    const reloadHotel = useCallback((target: HousekeepingReloadTarget) => runAction(() => HousekeepingApi.reload(target), `reload.${target}`), [runAction]);

    // -- LIVE IN-ROOM ACTIONS ---------------------------------------
    // These bridge directly to the active RoomSession so the
    // sanction lands on the current game state (no server roundtrip
    // through the HTTP layer). Use for "the user is here, right
    // now" sanctions; persistent admin actions still go through the
    // HTTP API above.
    const kickFromCurrentRoom = useCallback(
        (webUserId: number) => {
            const session = GetRoomSession();

            if (!session) {
                markActionDone('housekeeping.live.no_room', null);

                return false;
            }

            try {
                session.sendKickMessage(webUserId);
                markActionDone(null, 'housekeeping.live.kicked');
                showSingleBubble(localizeOrPassthrough('housekeeping.live.kicked'), NotificationBubbleType.INFO);

                return true;
            } catch (error) {
                markActionDone(String((error as Error)?.message ?? error), null);

                return false;
            }
        },
        [markActionDone, showSingleBubble]
    );

    const banFromCurrentRoom = useCallback(
        (webUserId: number, severity: 'hour' | 'day' | 'perm' = 'hour') => {
            const session = GetRoomSession();

            if (!session) {
                markActionDone('housekeeping.live.no_room', null);

                return false;
            }

            const code = severity === 'perm' ? 'RWUAM_BAN_USER_PERM' : severity === 'day' ? 'RWUAM_BAN_USER_DAY' : 'RWUAM_BAN_USER_HOUR';

            try {
                session.sendBanMessage(webUserId, code);
                markActionDone(null, 'housekeeping.live.banned');
                showSingleBubble(localizeOrPassthrough('housekeeping.live.banned'), NotificationBubbleType.INFO);

                return true;
            } catch (error) {
                markActionDone(String((error as Error)?.message ?? error), null);

                return false;
            }
        },
        [markActionDone, showSingleBubble]
    );

    // -- BULK HTTP ACTIONS ------------------------------------------
    // Loop with Promise.allSettled so a single failure doesn't abort
    // the rest of the batch. Aggregated success/failure counts land
    // in the status banner; per-user errors fall through to the audit
    // log on the server side.
    const runBulk = useCallback(
        async (
            userIds: ReadonlyArray<number>,
            single: (id: number) => Promise<IHousekeepingActionResult | null>,
            actionLabel: string
        ): Promise<{ ok: number; failed: number }> => {
            if (userIds.length === 0) return { ok: 0, failed: 0 };

            markActionPending();

            const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const settled = await Promise.allSettled(userIds.map((id) => single(id)));
            let ok = 0;
            let failed = 0;

            for (const outcome of settled) {
                if (outcome.status === 'fulfilled' && outcome.value && outcome.value.ok !== false) ok++;
                else failed++;
            }

            // One metric sample per bulk run rather than per user — the
            // bulk timing is what the operator cares about. Bucket suffix
            // `:bulk` keeps the metric separate from the matching single
            // action in the telemetry panel.
            const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

            recordActionMetric(`${actionLabel}:bulk`, endedAt - startedAt, failed > 0);

            const summaryKey = failed === 0 ? 'housekeeping.bulk.success' : 'housekeeping.bulk.partial';

            markActionDone(failed > 0 && ok === 0 ? 'housekeeping.bulk.failed' : null, failed === 0 ? summaryKey : null);
            showSingleBubble(`${localizeOrPassthrough('housekeeping.bulk.done')} — ${ok}/${userIds.length}`, NotificationBubbleType.INFO);

            return { ok, failed };
        },
        [markActionPending, markActionDone, showSingleBubble, recordActionMetric]
    );

    const banUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string, hours: number) => runBulk(userIds, (id) => HousekeepingApi.banUser(id, reason, hours), 'banUser'),
        [runBulk]
    );

    const kickUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string) => runBulk(userIds, (id) => HousekeepingApi.kickUser(id, reason), 'kickUser'),
        [runBulk]
    );

    const muteUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string, minutes: number) =>
            runBulk(userIds, (id) => HousekeepingApi.muteUser(id, reason, minutes), 'muteUser'),
        [runBulk]
    );

    const muteInCurrentRoom = useCallback(
        (webUserId: number, minutes: number) => {
            const session = GetRoomSession();

            if (!session) {
                markActionDone('housekeeping.live.no_room', null);

                return false;
            }

            try {
                session.sendMuteMessage(webUserId, minutes);
                markActionDone(null, 'housekeeping.live.muted');
                showSingleBubble(localizeOrPassthrough('housekeeping.live.muted'), NotificationBubbleType.INFO);

                return true;
            } catch (error) {
                markActionDone(String((error as Error)?.message ?? error), null);

                return false;
            }
        },
        [markActionDone, showSingleBubble]
    );

    return {
        banUser,
        unbanUser,
        muteUser,
        kickUser,
        forceDisconnectUser,
        resetUserPassword,
        setUserRank,
        tradeLockUser,
        openRoom,
        closeRoom,
        saveRoomSettings,
        muteRoom,
        kickAllFromRoom,
        transferRoomOwnership,
        deleteRoom,
        giveCredits,
        giveDuckets,
        giveDiamonds,
        grantItem,
        setHcSubscription,
        sendHotelAlert,
        startMaintenance,
        cancelMaintenance,
        disableMaintenance,
        addFilterWord,
        removeFilterWord,
        setPermission,
        setLockdown,
        addUserNote,
        deleteUserNote,
        reloadHotel,
        revokeBan,
        kickFromCurrentRoom,
        banFromCurrentRoom,
        muteInCurrentRoom,
        banUsersBulk,
        kickUsersBulk,
        muteUsersBulk
    };
};
