import { GetSessionDataManager, GuideSessionCreateMessageComposer, RoomEntryInfoMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import {
    GUIDE_REQUEST_TYPE_TOUR,
    getWelcomeTourDelayMs,
    NEW_IDENTITY_CONFIG,
    shouldOfferWelcomeTour,
    WELCOME_TOUR_DELAY_CONFIG,
    WELCOME_TOUR_ENABLED_CONFIG
} from './welcomeTour';

/**
 * The official new-user tour popup (GuideHelpManager + HelpController in the
 * AIR client): armed on room entry for a new identity, shown once per session
 * after the configured delay. "Take me on a tour" opens a guide session of
 * the tour type with the official canned request text; the guide tool then
 * takes over through GuideSessionAttached as for any other request.
 */
const useWelcomeTourState = () => {
    const [tourPopupVisible, setTourPopupVisible] = useState(false);
    const offeredRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const clearTimer = useCallback(() => {
        if (!timerRef.current) return;

        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const openTourPopup = useCallback(() => {
        clearTimer();
        offeredRef.current = true;
        setTourPopupVisible(true);
    }, [clearTimer]);

    const closeTourPopup = useCallback(() => setTourPopupVisible(false), []);

    const acceptTour = useCallback(() => {
        SendMessageComposer(new GuideSessionCreateMessageComposer(GUIDE_REQUEST_TYPE_TOUR, LocalizeText('guide.help.request.tour.description')));
        setTourPopupVisible(false);
    }, []);

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => {
        const gate = {
            tourEnabled: !!GetConfigurationValue<boolean>(WELCOME_TOUR_ENABLED_CONFIG, false),
            newIdentity: GetConfigurationValue<number>(NEW_IDENTITY_CONFIG, 0) > 0,
            isRealNoob: !!GetSessionDataManager().isRealNoob,
            alreadyOffered: offeredRef.current || !!timerRef.current
        };

        if (!shouldOfferWelcomeTour(gate)) return;

        timerRef.current = setTimeout(
            () => {
                timerRef.current = null;
                openTourPopup();
            },
            getWelcomeTourDelayMs(GetConfigurationValue<number>(WELCOME_TOUR_DELAY_CONFIG, null))
        );
    });

    useEffect(() => () => clearTimer(), [clearTimer]);

    return { tourPopupVisible, openTourPopup, closeTourPopup, acceptTour };
};

export const useWelcomeTour = () => useSharedHook(useWelcomeTourState);

registerSharedHook(useWelcomeTourState);
