import { HabboClubExtendConfirmMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetOptionalConfigurationValue, IPurse, localizeWithFallback, SendMessageComposer } from '../../../api';
import extendHilite from '../../../assets/images/purse/air/extend_hilite.png';
import hcIcon from '../../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import { BaseButton } from '../../../common/BaseButton';

/** AIR ClubDiscountPromoExtension: the highlight sweeps over the bar every 15 s. */
const SWEEP_INTERVAL_MS = 15000;

/** AIR club_promo: the membership runs out, the extension is on and the user is a member. */
export const isClubPromoVisible = (purse: IPurse | null, hcDisabled: boolean): boolean => {
    if (!purse || hcDisabled || !purse.isExpiring || purse.clubLevel < 1) return false;

    // AIR's switch, with our older one as its default.
    const ours = GetOptionalConfigurationValue<boolean>('club.membership.extend.promotion.enabled', true);

    return GetOptionalConfigurationValue<boolean>('club.membership.extend.vip.promotion.enabled', ours) !== false;
};

/**
 * AIR ClubDiscountPromoExtension (club_discount_promotion_xml, 192 x 44): the club icon and the underlined offer
 * (`discount.bar.hc.expiring`, `discount.bar.vip.expiring` for VIP) with the extend_hilite sweep every 15 s. A click
 * asks for the renewal offer (the extend window shows it). Under a day left it goes when the time runs out.
 */
export const ClubPromoView: FC<{ purse: IPurse }> = ({ purse }) => {
    const [sweepKey, setSweepKey] = useState(0);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const interval = window.setInterval(() => setSweepKey((key) => key + 1), SWEEP_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, []);

    const minutesLeft = purse.minutesUntilExpiration;

    useEffect(() => {
        setExpired(false);

        if (!(minutesLeft > 0 && minutesLeft < 1440)) return;

        const timeout = window.setTimeout(() => setExpired(true), minutesLeft * 60 * 1000);

        return () => window.clearTimeout(timeout);
    }, [minutesLeft]);

    if (expired) return null;

    const text =
        purse.clubLevel >= 2
            ? localizeWithFallback('discount.bar.vip.expiring', 'Renew your Habbo Club now and save credits!')
            : localizeWithFallback('discount.bar.hc.expiring', 'Save credits by renewing your Habbo Club now!');

    return (
        <div className="octane-purse-club-promo">
            {sweepKey > 0 && <img key={sweepKey} src={extendHilite} alt="" className="octane-purse-club-promo__sweep" />}
            <img src={hcIcon} alt="" className="octane-purse-club-promo__icon" />
            <BaseButton
                type="button"
                className="octane-purse-club-promo__text"
                onClick={() => SendMessageComposer(new HabboClubExtendConfirmMessageComposer())}
            >
                {text}
            </BaseButton>
        </div>
    );
};
