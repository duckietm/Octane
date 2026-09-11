/**
 * Pure gate of the official new-user tour popup (GuideHelpManager.onRoomEnter
 * in the AIR client): on every room entry, when the tour is enabled, the
 * account is a new identity that is not a "real noob" and the popup was not
 * shown yet this session, a timer shows the popup after
 * `guide.help.new.user.tour.popup.delay` seconds (default 30).
 */

export const WELCOME_TOUR_ENABLED_CONFIG = 'guide.help.new.user.tour.enabled';
export const WELCOME_TOUR_DELAY_CONFIG = 'guide.help.new.user.tour.popup.delay';
export const NEW_IDENTITY_CONFIG = 'new.identity';
export const WELCOME_TOUR_DEFAULT_DELAY_SECONDS = 30;

/** Request type of a guide session created by the tour popup (official createHelpRequest(0)). */
export const GUIDE_REQUEST_TYPE_TOUR = 0;

export interface WelcomeTourGate {
    tourEnabled: boolean;
    /** `new.identity` > 0: the renderer sets it when the noobness level is not OLD_IDENTITY. */
    newIdentity: boolean;
    isRealNoob: boolean;
    alreadyOffered: boolean;
}

export const shouldOfferWelcomeTour = (gate: WelcomeTourGate): boolean => gate.tourEnabled && gate.newIdentity && !gate.isRealNoob && !gate.alreadyOffered;

export const getWelcomeTourDelayMs = (configuredSeconds: number | null | undefined): number => {
    const seconds =
        typeof configuredSeconds === 'number' && Number.isFinite(configuredSeconds) && configuredSeconds >= 0
            ? configuredSeconds
            : WELCOME_TOUR_DEFAULT_DELAY_SECONDS;

    return seconds * 1000;
};
