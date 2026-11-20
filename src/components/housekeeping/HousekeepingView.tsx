import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, lazy, Suspense, useEffect, useMemo } from 'react';
import { HK_TICKET_STATE_OPEN, HousekeepingTabId, HousekeepingUserSection, isHousekeepingEnabled, isHousekeepingTabOpen } from '../../api';
import { useHasPermission, useHousekeepingStore, useModTools } from '../../hooks';
import type { HousekeepingNavGroup } from './views/shell/HousekeepingSidebar';

// The window and its tabs are loaded the first time an operator opens it: this view stays mounted for
// everyone to listen for the links and permissions, but players never download the staff tools.
const HousekeepingPanel = lazy(() => import('./HousekeepingPanel').then((module) => ({ default: module.HousekeepingPanel })));

const TAB_IDS: HousekeepingTabId[] = Object.values(HousekeepingTabId);

const isHkTabId = (value: string): value is HousekeepingTabId => (TAB_IDS as string[]).includes(value);

const decodeSegment = (segment: string | undefined): string => {
    try {
        return decodeURIComponent(segment || '');
    } catch {
        return segment || '';
    }
};

export const HousekeepingView: FC = () => {
    const {
        isVisible,
        setIsVisible,
        togglePanel,
        activeTab,
        setActiveTab,
        setUserSection,
        closePanel,
        lookupUserById,
        lookupRoomById,
        seedUserFromAvatar,
        selectedUserIds
    } = useHousekeepingStore();
    // Gate behind a dedicated HK permission so the panel stays hidden
    // for plain users/mods on servers that haven't granted it. Reactive
    // — promote/demote takes effect on the next render without a relog.
    const isHk = useHasPermission('acc_housekeeping');
    const canManageSoundboard = useHasPermission('acc_soundboard_manage');
    // One hook per area key, called every render: which tabs an operator sees (the server
    // enforces the same areas on every action).
    const canUsers = useHasPermission('acc_hk_users');
    const canRooms = useHasPermission('acc_hk_rooms');
    const canBans = useHasPermission('acc_hk_bans');
    const canHotel = useHasPermission('acc_hk_hotel');
    const canPermissions = useHasPermission('acc_hk_permissions');
    const holds = useMemo(() => {
        const held: Record<string, boolean> = {
            acc_hk_users: canUsers,
            acc_hk_rooms: canRooms,
            acc_hk_bans: canBans,
            acc_hk_hotel: canHotel,
            acc_hk_permissions: canPermissions,
            acc_soundboard_manage: canManageSoundboard
        };

        return (permission: string) => held[permission] === true;
    }, [canUsers, canRooms, canBans, canHotel, canPermissions, canManageSoundboard]);
    // Config gate on top of the permission: `housekeeping.enabled`
    // (boolean, default false) is the master switch for the whole module.
    // Config is read after `await GetConfiguration().init()` in
    // bootstrap.ts, so by the time React mounts we're reading a
    // populated value — no Suspense needed.
    const hkEnabled = useMemo(() => isHousekeepingEnabled(), []);
    // Tickets waiting for someone, shown on the Support entry.
    const { tickets = [] } = useModTools();
    const openTickets = tickets.filter((ticket) => ticket.state === HK_TICKET_STATE_OPEN).length;

    useEffect(() => {
        // Economy moved into the user page; the old tab id lands there.
        const openTab = (tab: HousekeepingTabId) => {
            if (tab === HousekeepingTabId.ECONOMY) {
                setUserSection(HousekeepingUserSection.ECONOMY);
                setActiveTab(HousekeepingTabId.USERS);

                return;
            }

            setActiveTab(tab);
        };

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
                    case 'tab': {
                        const candidate = parts[2] ?? '';
                        const canOpenCandidate = isHkTabId(candidate) && isHousekeepingTabOpen(candidate, holds);

                        if (isHkTabId(candidate) && canOpenCandidate) {
                            openTab(candidate);
                            setIsVisible(true);
                        }
                        return;
                    }
                    case 'user': {
                        // housekeeping/user/<id>[/<name>/<figure>] — the optional,
                        // URI-encoded name and figure paint the card at once while
                        // the find-by-id packet fills in the rest.
                        const userId = parseInt(parts[2] ?? '');

                        if (!Number.isFinite(userId) || userId <= 0 || !isHousekeepingTabOpen(HousekeepingTabId.USERS, holds)) return;

                        setActiveTab(HousekeepingTabId.USERS);
                        setIsVisible(true);

                        if (parts.length > 4) seedUserFromAvatar(userId, decodeSegment(parts[3]), decodeSegment(parts[4]));

                        lookupUserById(userId);
                        return;
                    }
                    case 'room': {
                        // housekeeping/room/<id> — opens the room page on that room.
                        const roomId = parseInt(parts[2] ?? '');

                        if (!Number.isFinite(roomId) || roomId <= 0 || !isHousekeepingTabOpen(HousekeepingTabId.ROOMS, holds)) return;

                        setActiveTab(HousekeepingTabId.ROOMS);
                        setIsVisible(true);
                        lookupRoomById(roomId);
                        return;
                    }
                }
            },
            eventUrlPrefix: 'housekeeping/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, togglePanel, closePanel, setActiveTab, setUserSection, lookupUserById, lookupRoomById, seedUserFromAvatar, holds]);

    // When the panel is gated off (perm revoked mid-session, or
    // `housekeeping.enabled` is false) make sure it isn't left visible.
    useEffect(() => {
        if ((!isHk || !hkEnabled) && isVisible) closePanel();
    }, [isHk, hkEnabled, isVisible, closePanel]);

    // Bounce a stored tab that is no longer reachable: the old economy tab, or a
    // tab whose area permission the operator does not hold (back to the dashboard).
    useEffect(() => {
        if (activeTab === HousekeepingTabId.ECONOMY) {
            setUserSection(HousekeepingUserSection.ECONOMY);
            setActiveTab(HousekeepingTabId.USERS);

            return;
        }

        if (!isHousekeepingTabOpen(activeTab, holds)) setActiveTab(HousekeepingTabId.DASHBOARD);
    }, [activeTab, holds, setActiveTab, setUserSection]);

    const navGroups = useMemo<HousekeepingNavGroup[]>(() => {
        const available = (id: HousekeepingTabId) => isHousekeepingTabOpen(id, holds);
        const groups: HousekeepingNavGroup[] = [
            {
                titleKey: 'housekeeping.nav.overview',
                items: [
                    { id: HousekeepingTabId.DASHBOARD, icon: 'icon-housekeeping', labelKey: 'housekeeping.tab.dashboard' },
                    { id: HousekeepingTabId.LIVE, icon: 'icon-progression', labelKey: 'housekeeping.tab.live' }
                ]
            },
            {
                titleKey: 'housekeeping.nav.moderation',
                items: [
                    { id: HousekeepingTabId.USERS, icon: 'icon-friendall', labelKey: 'housekeeping.tab.users', count: selectedUserIds.length },
                    { id: HousekeepingTabId.ROOMS, icon: 'icon-rooms', labelKey: 'housekeeping.tab.rooms' },
                    { id: HousekeepingTabId.SUPPORT, icon: 'icon-help', labelKey: 'housekeeping.tab.support', count: openTickets },
                    { id: HousekeepingTabId.BANS, icon: 'icon-modtools', labelKey: 'housekeeping.tab.bans' },
                    { id: HousekeepingTabId.AUDIT, icon: 'icon-message', labelKey: 'housekeeping.tab.audit' }
                ]
            },
            {
                titleKey: 'housekeeping.nav.hotel',
                items: [
                    { id: HousekeepingTabId.HOTEL, icon: 'icon-catalog', labelKey: 'housekeeping.tab.hotel' },
                    { id: HousekeepingTabId.PERMISSIONS, icon: 'icon-cog', labelKey: 'housekeeping.tab.permissions' }
                ]
            },
            {
                titleKey: 'housekeeping.nav.content',
                items: [{ id: HousekeepingTabId.SOUNDBOARD, icon: 'icon-soundboard', labelKey: 'housekeeping.tab.soundboard' }]
            }
        ];

        return groups.map((group) => ({ ...group, items: group.items.filter((item) => available(item.id)) }));
    }, [holds, selectedUserIds.length, openTickets]);

    if (!hkEnabled || !isHk || !isVisible) return null;

    return (
        <Suspense fallback={null}>
            <HousekeepingPanel
                activeTab={activeTab}
                canManageSoundboard={canManageSoundboard}
                navGroups={navGroups}
                onClose={closePanel}
                onSelectTab={setActiveTab}
            />
        </Suspense>
    );
};
