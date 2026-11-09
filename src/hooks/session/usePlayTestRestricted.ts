import { IsPlayTestRestricted } from '../../api';
import { useActiveRoomSessionSnapshot } from './useSessionSnapshots';

/**
 * `IsPlayTestRestricted` for a view: the active room session's snapshot is refreshed when playtest is
 * switched, so a button that disables itself in playtest follows the switch at once.
 */
export const usePlayTestRestricted = (): boolean => {
    const snapshot = useActiveRoomSessionSnapshot();

    return IsPlayTestRestricted(snapshot?.session ?? null);
};
