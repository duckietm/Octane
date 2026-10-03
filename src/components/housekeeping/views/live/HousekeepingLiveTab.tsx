import { FC } from 'react';
import { HousekeepingListChoice, HousekeepingListView } from '../common/HousekeepingListView';

const LIVE_LISTS: HousekeepingListChoice[] = [
    { key: 'hotel.online', labelKey: 'housekeeping.list.hotel.online' },
    { key: 'hotel.rooms', labelKey: 'housekeeping.list.hotel.rooms' }
];

/** Who is online right now and the rooms with people in them; a row opens the user or the room. */
export const HousekeepingLiveTab: FC = () => <HousekeepingListView hotelWide lists={LIVE_LISTS} targetId={0} />;
