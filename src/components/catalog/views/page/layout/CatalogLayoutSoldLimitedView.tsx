import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { useCatalogData } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutSoldLimitedView: FC<CatalogLayoutProps> = () => {
    const { currentOffer = null, currentPage = null } = useCatalogData();

    if (!currentPage?.offers.length) {
        return (
            <div className="octane-catalog-specialized-state" role="status">
                {LocalizeText('catalog.alert.limited_edition_sold_out.title')}
            </div>
        );
    }

    return (
        <div className="octane-catalog-sold-limited-layout">
            <div className="octane-catalog-sold-limited-preview">
                {currentOffer ? (
                    <>
                        <CatalogProductDetailsView offer={currentOffer} />
                        {typeof currentOffer.product?.getIconUrl === 'function' && <img alt="" src={currentOffer.product.getIconUrl(currentOffer)} />}
                        <strong>{LocalizeText('catalog.alert.limited_edition_sold_out.title')}</strong>
                    </>
                ) : (
                    <span>{LocalizeText('catalog.purchase.select.info')}</span>
                )}
            </div>
            <div className="octane-catalog-sold-limited-grid">
                <CatalogItemGridWidgetView columnCount={5} columnMinHeight={62} columnMinWidth={54} showPrices={false} />
            </div>
        </div>
    );
};
