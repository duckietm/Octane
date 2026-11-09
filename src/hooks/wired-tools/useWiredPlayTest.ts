import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { applyWiredPlayTestMode, WIRED_PLAYTEST_TOGGLE_LINK } from '../../api';

/**
 * The wired menu playtest preference on the room: every change goes to the room session manager
 * (which also puts it on each room entered later), and the toggle link flips it as AIR's
 * `:playtest` chat command does.
 */
export const useWiredPlayTest = (playTestMode: boolean, togglePlayTestMode: () => void) => {
    const toggleRef = useRef(togglePlayTestMode);

    useLayoutEffect(() => {
        toggleRef.current = togglePlayTestMode;
    });

    useEffect(() => {
        applyWiredPlayTestMode(playTestMode);
    }, [playTestMode]);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            eventUrlPrefix: WIRED_PLAYTEST_TOGGLE_LINK,
            linkReceived: () => toggleRef.current?.()
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);
};
