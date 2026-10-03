import { FC, ReactNode, useState } from 'react';
import { FaBullhorn, FaFilter, FaShieldAlt, FaSync, FaTools } from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { HousekeepingSubTabs } from '../common/HousekeepingSubTabs';
import { HousekeepingHotelAlertView } from './HousekeepingHotelAlertView';
import { HousekeepingMaintenanceView } from './HousekeepingMaintenanceView';
import { HousekeepingReloadView } from './HousekeepingReloadView';
import { HousekeepingSecurityView } from './HousekeepingSecurityView';
import { HousekeepingWordFilterView } from './HousekeepingWordFilterView';

type HotelToolsSection = 'alert' | 'maintenance' | 'reload' | 'wordfilter' | 'security';

const SECTIONS: { id: HotelToolsSection; icon: ReactNode }[] = [
    { id: 'alert', icon: <FaBullhorn size={10} /> },
    { id: 'maintenance', icon: <FaTools size={10} /> },
    { id: 'reload', icon: <FaSync size={10} /> },
    { id: 'wordfilter', icon: <FaFilter size={10} /> },
    { id: 'security', icon: <FaShieldAlt size={10} /> }
];

/** Hotel-wide tools: alerts, maintenance with a countdown, hot reloads and the word filter. */
export const HousekeepingHotelTab: FC = () => {
    const [section, setSection] = useState<HotelToolsSection>('alert');

    return (
        <div className="flex flex-col gap-2">
            <HousekeepingSubTabs<HotelToolsSection>
                active={section}
                tabs={SECTIONS.map(({ id, icon }) => ({ id, icon, label: LocalizeText(`housekeeping.hotel.section.${id}`) }))}
                onChange={setSection}
            />
            {section === 'alert' && <HousekeepingHotelAlertView />}
            {section === 'maintenance' && <HousekeepingMaintenanceView />}
            {section === 'reload' && <HousekeepingReloadView />}
            {section === 'wordfilter' && <HousekeepingWordFilterView />}
            {section === 'security' && <HousekeepingSecurityView />}
        </div>
    );
};
