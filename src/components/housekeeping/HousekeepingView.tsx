import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo } from 'react';
import { getHousekeepingMode, HousekeepingTabId, isHousekeepingEnabled, isHousekeepingTabAvailable, LocalizeText } from '../../api';
import {
    DraggableWindowPosition,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardTabsItemView,
    OctaneCardTabsView,
    OctaneCardView,
    WidgetErrorBoundary
} from '../../common';
import { useHasPermission, useHousekeepingStore } from '../../hooks';
import { HousekeepingPasswordReveal } from './HousekeepingPasswordReveal';
import { HousekeepingStatusBanner } from './HousekeepingStatusBanner';
import { HousekeepingAuditTab } from './views/audit/HousekeepingAuditTab';
import { HousekeepingDashboardTab } from './views/dashboard/HousekeepingDashboardTab';
import { HousekeepingEconomyTab } from './views/economy/HousekeepingEconomyTab';
import { HousekeepingRoomsTab } from './views/rooms/HousekeepingRoomsTab';
import { HousekeepingSoundboardTab } from './views/soundboard/HousekeepingSoundboardTab';
import { HousekeepingUsersTab } from './views/users/HousekeepingUsersTab';

const TAB_IDS: HousekeepingTabId[] = [
    HousekeepingTabId.DASHBOARD,
    HousekeepingTabId.USERS,
    HousekeepingTabId.ROOMS,
    HousekeepingTabId.ECONOMY,
    HousekeepingTabId.AUDIT,
    HousekeepingTabId.SOUNDBOARD
];

const isHkTabId = (value: string): value is HousekeepingTabId => (TAB_IDS as string[]).includes(value);

export const HousekeepingView: FC = () => {
    const { isVisible, setIsVisible, togglePanel, activeTab, setActiveTab, closePanel, lookupUserById, seedUserFromAvatar } = useHousekeepingStore();
    // Gate behind a dedicated HK permission so the panel stays hidden
    // for plain users/mods on servers that haven't granted it. Reactive
    // — promote/demote takes effect on the next render without a relog.
    const isHk = useHasPermission('acc_housekeeping');
    const canManageSoundboard = useHasPermission('acc_soundboard_manage');
    // Two-layer config gate on top of the permission:
    //   - `housekeeping.enabled` (boolean, default false): master kill
    //     switch for the whole module
    //   - `housekeeping.mode` ("light" | "full", default "full"):
    //     "light" exposes only Users + Rooms (essential moderation),
    //     "full" exposes all six tabs
    // Config is read after `await GetConfiguration().init()` in
    // bootstrap.ts, so by the time React mounts we're reading a
    // populated value — no Suspense needed.
    const hkEnabled = useMemo(() => isHousekeepingEnabled(), []);
    const hkMode = useMemo(() => getHousekeepingMode(), []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        closePanel();
                        return;
                    case 'toggle':
                        togglePanel();
                        return;
                    case 'tab':
                        if (parts.length > 2) {
                            const candidate = parts[2];

                            const canOpenCandidate = candidate !== HousekeepingTabId.SOUNDBOARD || canManageSoundboard;

                            if (isHkTabId(candidate) && canOpenCandidate && isHousekeepingTabAvailable(candidate, getHousekeepingMode())) {
                                setActiveTab(candidate);
                                setIsVisible(true);
                            }
                        }
                        return;
                    case 'user':
                        // housekeeping/user/<id>[/<name>/<figure>] — used by the
                        // in-room context menu to push a target into the HK
                        // panel and jump to the Users tab. When the optional
                        // name + figure segments are present the panel paints
                        // them synchronously (so the operator sees the target
                        // even if the find-by-id packet is slow / unhandled),
                        // and the background lookup enriches the rest. The
                        // segments are URI-encoded so usernames with spaces or
                        // figures with special chars survive the link round-trip.
                        if (parts.length > 2) {
                            const userId = parseInt(parts[2]);

                            if (Number.isFinite(userId) && userId > 0) {
                                setActiveTab(HousekeepingTabId.USERS);
                                setIsVisible(true);

                                if (parts.length > 4) {
                                    let name = '';
                                    let figure = '';

                                    try {
                                        name = decodeURIComponent(parts[3] || '');
                                    } catch {
                                        name = parts[3] || '';
                                    }
                                    try {
                                        figure = decodeURIComponent(parts[4] || '');
                                    } catch {
                                        figure = parts[4] || '';
                                    }

                                    seedUserFromAvatar(userId, name, figure);
                                }

                                lookupUserById(userId);
                            }
                        }
                        return;
                }
            },
            eventUrlPrefix: 'housekeeping/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, togglePanel, closePanel, setActiveTab, lookupUserById, seedUserFromAvatar, canManageSoundboard]);

    // When the panel is gated off (perm revoked mid-session, or
    // `housekeeping.enabled` is false) make sure it isn't left visible.
    useEffect(() => {
        if ((!isHk || !hkEnabled) && isVisible) closePanel();
    }, [isHk, hkEnabled, isVisible, closePanel]);

    // If light mode is active and the user is parked on a tab that
    // light doesn't expose (e.g. they switched modes between
    // sessions), bounce them to Users — the canonical default for
    // the trimmed layout.
    useEffect(() => {
        const soundboardDenied = activeTab === HousekeepingTabId.SOUNDBOARD && !canManageSoundboard;
        if (soundboardDenied || !isHousekeepingTabAvailable(activeTab, hkMode)) setActiveTab(HousekeepingTabId.USERS);
    }, [activeTab, hkMode, canManageSoundboard, setActiveTab]);

    const activeView = useMemo(() => {
        switch (activeTab) {
            case HousekeepingTabId.ROOMS:
                return <HousekeepingRoomsTab />;
            case HousekeepingTabId.ECONOMY:
                return <HousekeepingEconomyTab />;
            case HousekeepingTabId.AUDIT:
                return <HousekeepingAuditTab />;
            case HousekeepingTabId.SOUNDBOARD:
                return canManageSoundboard ? <HousekeepingSoundboardTab /> : <HousekeepingUsersTab />;
            case HousekeepingTabId.USERS:
                return <HousekeepingUsersTab />;
            case HousekeepingTabId.DASHBOARD:
            default:
                return <HousekeepingDashboardTab />;
        }
    }, [activeTab, canManageSoundboard]);

    if (!hkEnabled || !isHk || !isVisible) return null;

    const showDashboard = isHousekeepingTabAvailable(HousekeepingTabId.DASHBOARD, hkMode);
    const showEconomy = isHousekeepingTabAvailable(HousekeepingTabId.ECONOMY, hkMode);
    const showAudit = isHousekeepingTabAvailable(HousekeepingTabId.AUDIT, hkMode);
    const showSoundboard = canManageSoundboard && isHousekeepingTabAvailable(HousekeepingTabId.SOUNDBOARD, hkMode);
    const isLight = hkMode === 'light';
    const headerSuffix = isLight ? ` · ${LocalizeText('housekeeping.mode.light')}` : '';
    // Light mode is narrower because there are only 2 tabs and the
    // content density is lower — gives the operator more screen real
    // estate without a 600px-wide panel for two tabs.
    const sizeClass = isLight ? 'min-w-[420px] max-w-[480px]' : 'min-w-[620px] max-w-[700px]';

    return (
        <WidgetErrorBoundary name="HousekeepingView">
            <OctaneCardView
                className={`octane-housekeeping ${sizeClass}`}
                theme="primary-slim"
                uniqueKey="housekeeping"
                windowPosition={DraggableWindowPosition.TOP_CENTER}
            >
                <OctaneCardHeaderView headerText={`${LocalizeText('housekeeping.title')}${headerSuffix}`} onCloseClick={() => closePanel()} />
                <OctaneCardTabsView>
                    {showDashboard && (
                        <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.DASHBOARD} onClick={() => setActiveTab(HousekeepingTabId.DASHBOARD)}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="octane-icon octane-icon-hk-tab icon-housekeeping" />
                                <span>{LocalizeText('housekeeping.tab.dashboard')}</span>
                            </div>
                        </OctaneCardTabsItemView>
                    )}
                    <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.USERS} onClick={() => setActiveTab(HousekeepingTabId.USERS)}>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="octane-icon octane-icon-hk-tab icon-modtools" />
                            <span>{LocalizeText('housekeeping.tab.users')}</span>
                        </div>
                    </OctaneCardTabsItemView>
                    <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.ROOMS} onClick={() => setActiveTab(HousekeepingTabId.ROOMS)}>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="octane-icon octane-icon-hk-tab icon-rooms" />
                            <span>{LocalizeText('housekeeping.tab.rooms')}</span>
                        </div>
                    </OctaneCardTabsItemView>
                    {showEconomy && (
                        <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.ECONOMY} onClick={() => setActiveTab(HousekeepingTabId.ECONOMY)}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="octane-icon octane-icon-hk-tab icon-catalog" />
                                <span>{LocalizeText('housekeeping.tab.economy')}</span>
                            </div>
                        </OctaneCardTabsItemView>
                    )}
                    {showAudit && (
                        <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.AUDIT} onClick={() => setActiveTab(HousekeepingTabId.AUDIT)}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="octane-icon octane-icon-hk-tab icon-message" />
                                <span>{LocalizeText('housekeeping.tab.audit')}</span>
                            </div>
                        </OctaneCardTabsItemView>
                    )}
                    {showSoundboard && (
                        <OctaneCardTabsItemView isActive={activeTab === HousekeepingTabId.SOUNDBOARD} onClick={() => setActiveTab(HousekeepingTabId.SOUNDBOARD)}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="octane-icon octane-icon-hk-tab icon-soundboard" />
                                <span>{LocalizeText('housekeeping.tab.soundboard')}</span>
                            </div>
                        </OctaneCardTabsItemView>
                    )}
                </OctaneCardTabsView>
                <HousekeepingStatusBanner />
                <HousekeepingPasswordReveal />
                <OctaneCardContentView className="text-black" gap={2}>
                    {activeView}
                </OctaneCardContentView>
            </OctaneCardView>
        </WidgetErrorBoundary>
    );
};
