import { FC } from 'react';
import { Offer } from '../../../../../api';
import { LayoutLimitedEditionCompletePlateView } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';

export const CatalogLimitedItemWidgetView: FC = (props) => {
    const { currentOffer = null } = useCatalogData();

    if (!currentOffer || currentOffer.pricingModel !== Offer.PRICING_MODEL_SINGLE || !currentOffer.product.isUniqueLimitedItem) return null;

    return (
        <NativeTextTree>
            <LayoutLimitedEditionCompletePlateView
                uniqueLimitedItemsLeft={currentOffer.product.uniqueLimitedItemsLeft}
                uniqueLimitedSeriesSize={currentOffer.product.uniqueLimitedItemSeriesSize}
            />
        </NativeTextTree>
    );
};
