import { RoomEntryInfoMessageEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    CITIZENSHIP_POPUP_ENABLED_CONFIG,
    GetConfigurationValue,
    getCitizenshipWelcomeImageUrl,
    isCitizenshipEnabled,
    isTalentTrackEnabled,
    localizeWithFallback,
    NEW_IDENTITY_CONFIG,
    TALENT_TRACK_CITIZENSHIP
} from '../../api';
import { Button, Text } from '../../common';
import { useMessageEvent, useTalentTrack } from '../../hooks';

const CITIZENSHIP_POPUP_DELAY_MS = 10000;

/**
 * citizenship_welcome (480x302, CitizenshipPopupController): ten seconds after a new
 * identity enters its first room the citizenship track introduces itself; the popup has
 * no close button, only the open button and the postpone link.
 */
export const CitizenshipWelcomeView: FC<{}> = () => {
    const [visible, setVisible] = useState(false);
    const shownRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const { requestTalentTrack = null } = useTalentTrack();

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => {
        if (shownRef.current || timerRef.current) return;
        if (!isTalentTrackEnabled() || !isCitizenshipEnabled()) return;
        if (GetConfigurationValue<number>(NEW_IDENTITY_CONFIG, 0) <= 0) return;
        if (!GetConfigurationValue<boolean>(CITIZENSHIP_POPUP_ENABLED_CONFIG, false)) return;

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            shownRef.current = true;
            setVisible(true);
        }, CITIZENSHIP_POPUP_DELAY_MS);
    });

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        []
    );

    if (!visible) return null;

    const open = () => {
        setVisible(false);
        requestTalentTrack && requestTalentTrack(TALENT_TRACK_CITIZENSHIP);
    };

    return (
        <div className="octane-talent-modal">
            <div className="octane-citizenship-welcome">
                <div className="octane-citizenship-welcome-subtitle">{localizeWithFallback('citizenship.promo.popup.subtitle', 'WELCOME TO HABBO!')}</div>
                <div className="octane-citizenship-welcome-frame">
                    <div className="octane-citizenship-welcome-title">{localizeWithFallback('citizenship.promo.popup.title', 'Hiya! Nice to meet you!')}</div>
                    <div className="octane-citizenship-welcome-body">
                        <div className="octane-citizenship-welcome-text">
                            <Text bold className="octane-citizenship-welcome-heading" wrap>
                                {localizeWithFallback('citizenship.promo.popup.heading', "You've ventured into a world of magic and marvel. And rubber ducks.")}
                            </Text>
                            <Text wrap>
                                {localizeWithFallback(
                                    'citizenship.promo.popup.description.1',
                                    "We wanna keep our hotel safe and fun for everyone, so we'd like to teach you the basics of being a Habbo Citizen before you venture out on your own."
                                )}
                            </Text>
                            <Text wrap>
                                {localizeWithFallback(
                                    'citizenship.promo.popup.description.2',
                                    "Don't worry - it's fun, it's not going to take that long, and there'll be prizes. ;)"
                                )}
                            </Text>
                            <div className="octane-citizenship-welcome-actions">
                                <Button variant="primary" onClick={open}>
                                    {localizeWithFallback('citizenship.promo.popup.open.button', "Let's do this thing!")}
                                </Button>
                                <Text center className="octane-talent-link" underline onClick={() => setVisible(false)}>
                                    {localizeWithFallback('citizenship.promo.popup.close.button', 'Thanks, but I wanna take a look around first')}
                                </Text>
                            </div>
                        </div>
                        <img
                            alt=""
                            className="octane-citizenship-welcome-image"
                            src={getCitizenshipWelcomeImageUrl()}
                            onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
