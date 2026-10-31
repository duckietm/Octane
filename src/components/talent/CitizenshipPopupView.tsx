import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback, TALENT_TRACK_CITIZENSHIP } from '../../api';
import { AirModalDialog } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { LibraryImageView } from '../help/habbo-way/HabboWayPagerView';

interface CitizenshipPopupViewProps {
    onClose: () => void;
    onOpenTrack: (name: string) => void;
}

/**
 * Official CitizenshipPopupController (`citizenship_welcome`, 480x302): the welcome of a new user,
 * with the button that opens the citizenship track and the "look around first" link. No close box.
 */
export const CitizenshipPopupView: FC<CitizenshipPopupViewProps> = ({ onClose, onOpenTrack }) => {
    const library = GetConfigurationValue<string>('image.library.url', '');

    return (
        <NativeTextTree>
            <AirModalDialog
                noCloseButton
                caption={localizeWithFallback('citizenship.promo.popup.title', 'Hi there! Nice to meet you!')}
                className="octane-citizenship-popup"
                subtitle={localizeWithFallback('citizenship.promo.popup.subtitle', 'WELCOME TO HABBO!')}
                width={480}
                onClose={onClose}
            >
                <div className="octane-citizenship-popup__body">
                    <div className="octane-citizenship-popup__copy">
                        <div className="octane-citizenship-popup__heading">{localizeWithFallback('citizenship.promo.popup.heading', 'You are entering a world of magic and wonder.')}</div>
                        <div>{localizeWithFallback('citizenship.promo.popup.description.1', 'We want the hotel to be fun and safe for everyone.')}</div>
                        <div>{localizeWithFallback('citizenship.promo.popup.description.2', 'It is fun, it is quick and there are prizes.')}</div>
                        <div className="octane-citizenship-popup__actions">
                            <BaseButton
                                className="octane-habboway__action"
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenTrack(TALENT_TRACK_CITIZENSHIP);
                                }}
                            >
                                {localizeWithFallback('citizenship.promo.popup.open.button', "Yes, let's do it!")}
                            </BaseButton>
                            <BaseButton className="octane-talent-dialog__decline" type="button" onClick={onClose}>
                                {localizeWithFallback('citizenship.promo.popup.close.button', 'Thanks, but I want to look around first')}
                            </BaseButton>
                        </div>
                    </div>
                    <LibraryImageView className="octane-citizenship-popup__image" src={`${library}talent/welcome.png`} />
                </div>
            </AirModalDialog>
        </NativeTextTree>
    );
};
