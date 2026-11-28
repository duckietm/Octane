import { FC } from 'react';
import { HousekeepingTabId } from '../../../../api';
import { HousekeepingAuditTab } from '../audit/HousekeepingAuditTab';
import { HousekeepingBansTab } from '../bans/HousekeepingBansTab';
import { HousekeepingDashboardTab } from '../dashboard/HousekeepingDashboardTab';
import { HousekeepingHotelTab } from '../hotel/HousekeepingHotelTab';
import { HousekeepingLiveTab } from '../live/HousekeepingLiveTab';
import { HousekeepingPermissionsTab } from '../permissions/HousekeepingPermissionsTab';
import { HousekeepingProfileImagesTab } from '../profile-images/HousekeepingProfileImagesTab';
import { HousekeepingRoomsTab } from '../rooms/HousekeepingRoomsTab';
import { HousekeepingSoundboardTab } from '../soundboard/HousekeepingSoundboardTab';
import { HousekeepingSupportTab } from '../support/HousekeepingSupportTab';
import { HousekeepingUsersTab } from '../users/HousekeepingUsersTab';

/** The page of one section of the panel; the desktop window and the phone sheet show the same pages. */
export const HousekeepingTabContent: FC<{ activeTab: HousekeepingTabId; canManageSoundboard: boolean }> = ({ activeTab, canManageSoundboard }) => {
    switch (activeTab) {
        case HousekeepingTabId.LIVE:
            return <HousekeepingLiveTab />;
        case HousekeepingTabId.ROOMS:
            return <HousekeepingRoomsTab />;
        case HousekeepingTabId.SUPPORT:
            return <HousekeepingSupportTab />;
        case HousekeepingTabId.BANS:
            return <HousekeepingBansTab />;
        case HousekeepingTabId.PROFILE_IMAGES:
            return <HousekeepingProfileImagesTab />;
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
};
