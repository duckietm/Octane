import { CreateLinkEvent, GetSessionDataManager } from '@octane/renderer';
import { useEffect } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../api';
import { firstNewUserPromo, hasRoomPromo, NewUserPromo, newUserPromoLink, ROOM_PROMO } from '../../api/nux/NewUserPromos';

const SHOWN_KEY = 'octane.new_user_promos.shown';

/** The accounts that were shown their welcome bubbles in this browser. */
const readShown = (): number[] => {
    try {
        const value = JSON.parse(window.localStorage.getItem(SHOWN_KEY) ?? '[]');

        return Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
    } catch {
        return [];
    }
};

const markShown = (userId: number) => {
    try {
        window.localStorage.setItem(SHOWN_KEY, JSON.stringify([...readShown().filter((id) => id !== userId), userId].slice(-50)));
    } catch {
        // Without storage the bubbles simply show again next time.
    }
};

const showPromo = (promo: NewUserPromo) => CreateLinkEvent(newUserPromoLink(promo, localizeWithFallback(promo.textKey, promo.fallback)));

/**
 * The official welcome bubbles of a new player, when the hotel sets `new.user.wing`: the wing's bubble after
 * `new.user.promo.delay` seconds (10) and the own-room bubble after `new.user.promo.room.delay` seconds (180).
 *
 * The server calls every account a new identity, so "new" cannot be read from it: each account gets the bubbles
 * once per browser instead.
 */
export const useNewUserPromos = () => {
    useEffect(() => {
        const wing = GetConfigurationValue<string>('new.user.wing', '');
        const userId = GetSessionDataManager()?.userId ?? 0;

        if (!wing || !GetSessionDataManager()?.isNoob || userId <= 0 || readShown().includes(userId)) return;

        const timers: ReturnType<typeof setTimeout>[] = [];
        const first = firstNewUserPromo(wing);
        const firstDelay = GetConfigurationValue<number>('new.user.promo.delay', 10) * 1000;
        const roomDelay = GetConfigurationValue<number>('new.user.promo.room.delay', 180) * 1000;
        const show = (promo: NewUserPromo) => {
            markShown(userId);
            showPromo(promo);
        };

        if (first && firstDelay > 0) timers.push(setTimeout(() => show(first), firstDelay));
        if (hasRoomPromo(wing) && roomDelay > 0) timers.push(setTimeout(() => show(ROOM_PROMO), roomDelay));

        return () => timers.forEach((timer) => clearTimeout(timer));
    }, []);
};
