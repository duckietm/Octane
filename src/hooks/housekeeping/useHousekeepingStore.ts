import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    emptySample,
    GetConfigurationValue,
    HousekeepingApi,
    HousekeepingRoomSection,
    HousekeepingTabId,
    HousekeepingUserSection,
    IHousekeepingActionLogEntry,
    IHousekeepingDangerRequest,
    IHousekeepingDashboard,
    IHousekeepingRoom,
    IHousekeepingRoomSummary,
    IHousekeepingUser,
    IHousekeepingUserSummary,
    loadRecentLookups,
    persistRecentLookups,
    pushRecentLookup,
    RecentLookupEntry,
    recordSample
} from '../../api';
import { useLocalStorage } from '../useLocalStorage';

const AUDIT_POLL_DEFAULT_MS = 30000;
const AUDIT_POLL_MIN_MS = 5000;

const ACTION_LOG_LIMIT = 100;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;
const AUTOCOMPLETE_MIN_PREFIX = 2;

const useHousekeepingStoreInner = () => {
    const [isVisible, setIsVisible] = useState(false);
    // Last-tab is persisted per user (useLocalStorage auto-scopes the key
    // by userId from the URL) so reopening the panel lands on the same
    // tab the operator was using. HousekeepingView's auto-redirect
    // effect handles a persisted tab the operator may no longer open.
    const [activeTab, setActiveTab] = useLocalStorage<HousekeepingTabId>('nitro.housekeeping.last_tab', HousekeepingTabId.DASHBOARD);
    const [selectedUser, setSelectedUser] = useState<IHousekeepingUser | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<IHousekeepingRoom | null>(null);
    // Which sub-page of the user and room pages is open; kept here so a link
    // (housekeeping/tab/economy) or the global search can land on a sub-page.
    const [userSection, setUserSection] = useState<HousekeepingUserSection>(HousekeepingUserSection.SANCTIONS);
    const [roomSection, setRoomSection] = useState<HousekeepingRoomSection>(HousekeepingRoomSection.SETTINGS);
    // The dangerous action waiting for its typed confirmation, if any.
    const [dangerRequest, setDangerRequest] = useState<IHousekeepingDangerRequest | null>(null);
    const [actionLog, setActionLog] = useState<IHousekeepingActionLogEntry[]>([]);
    const [isUserLoading, setIsUserLoading] = useState(false);
    const [isRoomLoading, setIsRoomLoading] = useState(false);
    const [isActionPending, setIsActionPending] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastSuccess, setLastSuccess] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<IHousekeepingDashboard | null>(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [userSuggestions, setUserSuggestions] = useState<IHousekeepingUserSummary[]>([]);
    const [roomSuggestions, setRoomSuggestions] = useState<IHousekeepingRoomSummary[]>([]);
    const [recentLookups, setRecentLookups] = useState<RecentLookupEntry[]>(() => loadRecentLookups());
    // Multi-select state for the Users tab. We use an array of ids
    // rather than a Set because the Zustand-backed snapshot re-renders
    // on referential equality — mutating a Set in place would miss
    // updates. Capped via the dedupe in toggleUserSelection.
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    // Password-reveal state — when reset-password succeeds, the emulator
    // returns the freshly-generated plaintext password in the action
    // result. We hold it in a dedicated state slot (not the success
    // banner) so it doesn't auto-dismiss and the operator can read /
    // copy it. Cleared manually via `clearPasswordReveal()` — sensitive
    // data, treat it like a one-shot secret.
    const [passwordReveal, setPasswordReveal] = useState<{ userId: number; username: string; password: string } | null>(null);
    const revealPassword = useCallback((userId: number, username: string, password: string) => {
        if (!password) return;
        setPasswordReveal({ userId, username, password });
    }, []);
    const clearPasswordReveal = useCallback(() => setPasswordReveal(null), []);
    // Per-action latency / count / error metrics. Map → triggers a
    // new reference on every update so subscribers re-render.
    // Capped per-action via `recordSample`'s sliding window so the
    // memory footprint is bounded regardless of session length.
    const [metricsByAction, setMetricsByAction] = useState<Map<string, import('../../api').MetricSample>>(() => new Map());
    // Track the most-recent fetch per slot so out-of-order responses don't
    // flash stale data into the panel.
    const userFetchTokenRef = useRef(0);
    const roomFetchTokenRef = useRef(0);
    const userSuggestTokenRef = useRef(0);
    const roomSuggestTokenRef = useRef(0);
    const userSuggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomSuggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userSuggestAbortRef = useRef<AbortController | null>(null);
    const roomSuggestAbortRef = useRef<AbortController | null>(null);

    useEffect(
        () => () => {
            if (userSuggestTimerRef.current) clearTimeout(userSuggestTimerRef.current);
            if (roomSuggestTimerRef.current) clearTimeout(roomSuggestTimerRef.current);
            userSuggestAbortRef.current?.abort();
            roomSuggestAbortRef.current?.abort();
        },
        []
    );

    const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
        setIsDashboardLoading(true);

        try {
            const data = await HousekeepingApi.getDashboard(signal);

            if (signal?.aborted) return;

            setDashboard(data ?? null);
        } catch {
            if (!signal?.aborted) setDashboard(null);
        } finally {
            if (!signal?.aborted) setIsDashboardLoading(false);
        }
    }, []);

    const fetchAuditLog = useCallback(async (signal?: AbortSignal) => {
        try {
            const entries = await HousekeepingApi.listActionLog(ACTION_LOG_LIMIT, signal);

            if (signal?.aborted) return;

            setActionLog(Array.isArray(entries) ? entries : []);
        } catch {
            if (!signal?.aborted) setActionLog([]);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const controller = new AbortController();

        // Refresh dashboard + audit log every time the panel opens so
        // a HK who's been away doesn't see a stale snapshot. We
        // INTENTIONALLY call the async fetchers from inside the effect
        // — they're external-system calls (HTTP + signal-aware abort)
        // not derived state, which is exactly the case
        // set-state-in-effect's docs carve out. The setState inside
        // the fetchers lands in a microtask after the await, not in
        // this synchronous effect body.
        fetchDashboard(controller.signal);
        fetchAuditLog(controller.signal);

        return () => controller.abort();
    }, [isVisible, fetchDashboard, fetchAuditLog]);

    // Live audit polling. While the panel is open AND the document
    // is visible, repoll the audit endpoint on a configurable
    // interval (`housekeeping.audit.poll_interval_ms`, default 30s,
    // floor 5s). Set to 0 to disable. Pauses entirely on tab-hidden
    // so a stack of background sessions doesn't hammer the admin
    // endpoint.
    //
    // This is intentionally HTTP polling rather than `useMessageEvent`
    // — the latter would require a new HousekeepingAuditPushEvent
    // composer/parser in the renderer SDK, which is out of scope for
    // a client-only change. Drop-in upgrade path documented in
    // CLAUDE.md when the wire protocol catches up.
    useEffect(() => {
        if (!isVisible) return;

        const configured = GetConfigurationValue<number>('housekeeping.audit.poll_interval_ms', AUDIT_POLL_DEFAULT_MS);
        const intervalMs = typeof configured === 'number' && configured >= AUDIT_POLL_MIN_MS ? configured : configured === 0 ? 0 : AUDIT_POLL_DEFAULT_MS;

        if (intervalMs === 0) return; // operator opted out via config

        let handle: ReturnType<typeof setInterval> | null = null;

        const start = () => {
            if (handle) return;

            handle = setInterval(() => {
                if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

                fetchAuditLog();
            }, intervalMs);
        };

        const stop = () => {
            if (handle) clearInterval(handle);
            handle = null;
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') start();
            else stop();
        };

        start();

        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stop();

            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [isVisible, fetchAuditLog]);

    const clearStatus = useCallback(() => {
        setLastError(null);
        setLastSuccess(null);
    }, []);

    const rememberLookup = useCallback((entry: RecentLookupEntry) => {
        setRecentLookups((prev) => {
            const next = pushRecentLookup(prev, entry);

            persistRecentLookups(next);

            return next;
        });
    }, []);

    const lookupUserByName = useCallback(
        async (username: string) => {
            const token = ++userFetchTokenRef.current;

            setIsUserLoading(true);
            clearStatus();

            try {
                const result = await HousekeepingApi.findUserByName(username);

                if (userFetchTokenRef.current !== token) return null;

                setSelectedUser(result ?? null);

                if (result) rememberLookup({ kind: 'user', id: result.id, label: result.username, at: Date.now() });
                else setLastError('housekeeping.user.not_found');

                return result;
            } catch (error) {
                if (userFetchTokenRef.current === token) setLastError(String((error as Error)?.message ?? error));

                return null;
            } finally {
                if (userFetchTokenRef.current === token) setIsUserLoading(false);
            }
        },
        [clearStatus, rememberLookup]
    );

    /**
     * Optimistic seed used when the operator clicks an avatar in-room —
     * the renderer already knows id / name / figure, so we surface those
     * immediately while the findUserById packet enriches the rest
     * (credits, email, ipLast, …) in the background. If the packet
     * times out we keep the hint so actions still work on the userId.
     */
    const seedUserFromAvatar = useCallback(
        (userId: number, username: string, figure: string) => {
            if (!Number.isFinite(userId) || userId <= 0) return;

            const hint: IHousekeepingUser = {
                id: userId,
                username: username || '',
                motto: '',
                figure: figure || '',
                rank: 0,
                rankName: '',
                online: true,
                lastOnlineAt: null,
                creditsBalance: 0,
                ducketsBalance: 0,
                diamondsBalance: 0,
                email: '',
                ipLast: '',
                isBanned: false,
                isMuted: false,
                isTradeLocked: false,
                profile: null
            };

            setSelectedUser(hint);
            rememberLookup({ kind: 'user', id: userId, label: hint.username, at: Date.now() });
        },
        [rememberLookup]
    );

    const lookupUserById = useCallback(
        async (userId: number) => {
            const token = ++userFetchTokenRef.current;

            setIsUserLoading(true);
            clearStatus();

            try {
                const result = await HousekeepingApi.findUserById(userId);

                if (userFetchTokenRef.current !== token) return null;

                // Don't blank the optimistic seed when the lookup times out
                // or returns null — operators clicking in-room want the
                // hint to stay visible so the action buttons remain usable.
                if (result) {
                    setSelectedUser(result);
                    rememberLookup({ kind: 'user', id: result.id, label: result.username, at: Date.now() });
                } else {
                    setLastError('housekeeping.user.not_found');
                }

                return result;
            } catch (error) {
                if (userFetchTokenRef.current === token) setLastError(String((error as Error)?.message ?? error));

                return null;
            } finally {
                if (userFetchTokenRef.current === token) setIsUserLoading(false);
            }
        },
        [clearStatus, rememberLookup]
    );

    const lookupRoomById = useCallback(
        async (roomId: number) => {
            const token = ++roomFetchTokenRef.current;

            setIsRoomLoading(true);
            clearStatus();

            try {
                const result = await HousekeepingApi.findRoomById(roomId);

                if (roomFetchTokenRef.current !== token) return null;

                setSelectedRoom(result ?? null);

                if (result) rememberLookup({ kind: 'room', id: result.id, label: result.name, at: Date.now() });
                else setLastError('housekeeping.room.not_found');

                return result;
            } catch (error) {
                if (roomFetchTokenRef.current === token) setLastError(String((error as Error)?.message ?? error));

                return null;
            } finally {
                if (roomFetchTokenRef.current === token) setIsRoomLoading(false);
            }
        },
        [clearStatus, rememberLookup]
    );

    const requestUserSuggestions = useCallback((prefix: string) => {
        if (userSuggestTimerRef.current) clearTimeout(userSuggestTimerRef.current);

        const trimmed = (prefix || '').trim();

        if (trimmed.length < AUTOCOMPLETE_MIN_PREFIX) {
            userSuggestAbortRef.current?.abort();
            setUserSuggestions([]);

            return;
        }

        userSuggestTimerRef.current = setTimeout(async () => {
            userSuggestAbortRef.current?.abort();
            const controller = new AbortController();

            userSuggestAbortRef.current = controller;

            const token = ++userSuggestTokenRef.current;

            try {
                const list = await HousekeepingApi.searchUsers(trimmed, controller.signal);

                if (controller.signal.aborted || userSuggestTokenRef.current !== token) return;

                setUserSuggestions(Array.isArray(list) ? list : []);
            } catch {
                if (!controller.signal.aborted) setUserSuggestions([]);
            }
        }, AUTOCOMPLETE_DEBOUNCE_MS);
    }, []);

    const requestRoomSuggestions = useCallback((prefix: string) => {
        if (roomSuggestTimerRef.current) clearTimeout(roomSuggestTimerRef.current);

        const trimmed = (prefix || '').trim();

        if (trimmed.length < AUTOCOMPLETE_MIN_PREFIX) {
            roomSuggestAbortRef.current?.abort();
            setRoomSuggestions([]);

            return;
        }

        roomSuggestTimerRef.current = setTimeout(async () => {
            roomSuggestAbortRef.current?.abort();
            const controller = new AbortController();

            roomSuggestAbortRef.current = controller;

            const token = ++roomSuggestTokenRef.current;

            try {
                const list = await HousekeepingApi.searchRooms(trimmed, controller.signal);

                if (controller.signal.aborted || roomSuggestTokenRef.current !== token) return;

                setRoomSuggestions(Array.isArray(list) ? list : []);
            } catch {
                if (!controller.signal.aborted) setRoomSuggestions([]);
            }
        }, AUTOCOMPLETE_DEBOUNCE_MS);
    }, []);

    const markActionPending = useCallback(() => setIsActionPending(true), []);
    const markActionDone = useCallback((errorKey: string | null, successKey: string | null) => {
        setIsActionPending(false);
        setLastError(errorKey);
        setLastSuccess(successKey);
    }, []);

    const closePanel = useCallback(() => {
        setIsVisible(false);
        clearStatus();
    }, [clearStatus]);

    const togglePanel = useCallback(() => setIsVisible((value) => !value), []);

    const toggleUserSelection = useCallback((userId: number) => {
        setSelectedUserIds((prev) => {
            if (prev.includes(userId)) return prev.filter((id) => id !== userId);

            return [...prev, userId];
        });
    }, []);

    const clearUserSelection = useCallback(() => setSelectedUserIds([]), []);

    const recordActionMetric = useCallback((action: string, latencyMs: number, isError: boolean) => {
        setMetricsByAction((prev) => {
            const next = new Map(prev);
            const current = next.get(action) ?? emptySample();

            next.set(action, recordSample(current, latencyMs, isError));

            return next;
        });
    }, []);

    const resetActionMetrics = useCallback(() => setMetricsByAction(new Map()), []);

    return {
        isVisible,
        setIsVisible,
        togglePanel,
        closePanel,
        activeTab,
        setActiveTab,
        selectedUser,
        setSelectedUser,
        selectedRoom,
        setSelectedRoom,
        userSection,
        setUserSection,
        roomSection,
        setRoomSection,
        dangerRequest,
        setDangerRequest,
        actionLog,
        setActionLog,
        isUserLoading,
        isRoomLoading,
        isActionPending,
        markActionPending,
        markActionDone,
        lastError,
        lastSuccess,
        clearStatus,
        lookupUserByName,
        lookupUserById,
        seedUserFromAvatar,
        lookupRoomById,
        dashboard,
        isDashboardLoading,
        refreshDashboard: fetchDashboard,
        refreshAuditLog: fetchAuditLog,
        userSuggestions,
        roomSuggestions,
        requestUserSuggestions,
        requestRoomSuggestions,
        recentLookups,
        selectedUserIds,
        toggleUserSelection,
        clearUserSelection,
        passwordReveal,
        revealPassword,
        clearPasswordReveal,
        metricsByAction,
        recordActionMetric,
        resetActionMetrics
    };
};

/**
 * Singleton store backing the housekeeping panel. State, lookups,
 * dashboard/audit fetches, autocomplete + recent-lookups
 * persistence all live in one shared source so every tab
 * shares the same view of the world — and reopening the panel
 * doesn't re-fetch state that's already in memory.
 */
export const useHousekeepingStore = () => useSharedHook(useHousekeepingStoreInner);

registerSharedHook(useHousekeepingStoreInner);
