import { FC } from 'react';
import { LocalizeShortNumber } from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';

interface CatalogAdminOfferPriceViewProps {
    credits?: number;
    points?: number;
    pointsType?: number;
}

export const CatalogAdminOfferPriceView: FC<CatalogAdminOfferPriceViewProps> = (props) => {
    const { credits = 0, points = 0, pointsType = 0 } = props;

    if (credits <= 0 && points <= 0) return null;

    return (
        <span className="octane-catalog-admin-offer-price">
            {credits > 0 && (
                <span className="octane-catalog-admin-offer-price-entry">
                    <span>{LocalizeShortNumber(credits)}</span>
                    <LayoutCurrencyIcon type={-1} />
                </span>
            )}
            {points > 0 && (
                <span className="octane-catalog-admin-offer-price-entry">
                    {credits > 0 && <span className="octane-catalog-admin-offer-price-plus">+</span>}
                    <span>{LocalizeShortNumber(points)}</span>
                    <LayoutCurrencyIcon type={pointsType} />
                </span>
            )}
        </span>
    );
};
