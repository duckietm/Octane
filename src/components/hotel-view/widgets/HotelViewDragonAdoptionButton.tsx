import { FC, useEffect } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { showsCursedDragonButton } from '../../../api/catalog/CursedDragonAdoption';
import { BaseButton } from '../../../common/BaseButton';
import { useCursedDragonAdoption } from '../../../hooks/catalog/useCursedDragonAdoption';

/**
 * The "free cursed dragon" button on the left of the home screen, as the official hotel showed it during the dragon
 * adoption. It asks the server on every visit of the home screen and shows only while this user can still adopt: a
 * hotel that does not offer the adoption, or a user who adopted, never sees it. `cursed_dragon_adoption.button.enabled`
 * (default true) turns it off altogether.
 */
export const HotelViewDragonAdoptionButton: FC<{}> = () => {
    const { claimState = 0, open = null, checkAvailability = null } = useCursedDragonAdoption();
    const enabled = GetConfigurationValue<boolean>('cursed_dragon_adoption.button.enabled', true) !== false;

    useEffect(() => {
        if (enabled) checkAvailability?.();
    }, [enabled, checkAvailability]);

    if (!enabled || !showsCursedDragonButton(claimState)) return null;

    return (
        <BaseButton className="hotelview-dragon-adoption" onClick={() => open()}>
            <span className="hotelview-dragon-adoption__crate" />
            <span className="hotelview-dragon-adoption__text">
                <span className="hotelview-dragon-adoption__title">{localizeWithFallback('cursed_dragon_adoption.button.title', 'Free Cursed Dragon')}</span>
                <span className="hotelview-dragon-adoption__info">{localizeWithFallback('cursed_dragon_adoption.button.info', 'Adopt yours now')}</span>
            </span>
        </BaseButton>
    );
};
