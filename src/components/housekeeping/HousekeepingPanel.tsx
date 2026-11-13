import { FC, useMemo } from 'react';
import { HousekeepingTabId, LocalizeText } from '../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, WidgetErrorBoundary } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HousekeepingDangerConfirmView } from './HousekeepingDangerConfirmView';
import { HousekeepingPasswordReveal } from './HousekeepingPasswordReveal';
import { HousekeepingStatusBanner } from './HousekeepingStatusBanner';
import { HousekeepingAuditTab } from './views/audit/HousekeepingAuditTab';
import { HousekeepingBansTab } from './views/bans/HousekeepingBansTab';
import { HousekeepingDashboardTab } from './views/dashboard/HousekeepingDashboardTab';
import { HousekeepingHotelTab } from './views/hotel/HousekeepingHotelTab';
import { HousekeepingLiveTab } from './views/live/HousekeepingLiveTab';
import { HousekeepingPermissionsTab } from './views/permissions/HousekeepingPermissionsTab';
import { HousekeepingRoomsTab } from './views/rooms/HousekeepingRoomsTab';
import { HousekeepingNavGroup, HousekeepingSidebar } from './views/shell/HousekeepingSidebar';
import { HousekeepingSoundboardTab } from './views/soundboard/HousekeepingSoundboardTab';
import { HousekeepingSupportTab } from './views/support/HousekeepingSupportTab';
import { HousekeepingUsersTab } from './views/users/HousekeepingUsersTab';

export interface HousekeepingPanelProps {
    activeTab: HousekeepingTabId;
    navGroups: HousekeepingNavGroup[];
    canManageSoundboard: boolean;
    onSelectTab: (tab: HousekeepingTabId) => void;
    onClose: () => void;
}

/**
 * The open Housekeeping window: sidebar, banners and the tabs. Loaded only when an operator opens
 * the panel (see HousekeepingView), so players never download the staff tools.
 */
export const HousekeepingPanel: FC<HousekeepingPanelProps> = ({ activeTab, navGroups, canManageSoundboard, onSelectTab, onClose }) => {
    const activeView = useMemo(() => {
        switch (activeTab) {
            case HousekeepingTabId.LIVE:
                return <HousekeepingLiveTab />;
            case HousekeepingTabId.ROOMS:
                return <HousekeepingRoomsTab />;
            case HousekeepingTabId.SUPPORT:
                return <HousekeepingSupportTab />;
            case HousekeepingTabId.BANS:
                return <HousekeepingBansTab />;
            case HousekeepingTabId.AUDIT:
                return <HousekeepingAuditTab />;
            case HousekeepingTabId.HOTEL:
                return <HousekeepingHotelTab />;
            case HousekeepingTabId.PERMISSIONS:
                return <HousekeepingPermissionsTab />;
            case HousekeepingTabId.SOUNDBOARD:
                return canManageSoundboard ? <HousekeepingSoundboardTab /> : <HousekeepingUsersTab />;
            case HousekeepingTabId.USERS:
            case HousekeepingTabId.ECONOMY:
                return <HousekeepingUsersTab />;
            case HousekeepingTabId.DASHBOARD:
            default:
                return <HousekeepingDashboardTab />;
        }
    }, [activeTab, canManageSoundboard]);

    return (
        <NativeTextTree>
            <WidgetErrorBoundary name="HousekeepingView">
                <OctaneCardView
                    className={`octane-housekeeping w-[860px] h-[620px] max-h-[92vh] max-w-[96vw]`}
                    theme="primary-slim"
                    uniqueKey="housekeeping"
                    windowPosition={DraggableWindowPosition.TOP_CENTER}
                >
                    <OctaneCardHeaderView headerText={LocalizeText('housekeeping.title')} onCloseClick={() => onClose()} />
                    <div className="relative flex min-h-0 grow text-black">
                        <HousekeepingSidebar active={activeTab} groups={navGroups} onSelect={onSelectTab} />
                        <div className="flex min-w-0 grow flex-col">
                            <HousekeepingStatusBanner />
                            <HousekeepingPasswordReveal />
                            <OctaneCardContentView className="min-h-0 grow text-black" gap={2}>
                                {activeView}
                            </OctaneCardContentView>
                        </div>
                        <HousekeepingDangerConfirmView />
                    </div>
                </OctaneCardView>
            </WidgetErrorBoundary>
        </NativeTextTree>
    );
};
