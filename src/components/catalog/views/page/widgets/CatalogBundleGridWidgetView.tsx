import { FC, useEffect, useRef } from 'react';
import { GetProductIconUrl } from '../../../../../api';
import { AutoGrid, AutoGridProps, LayoutGridItem } from '../../../../../common';
import { useCatalogData } from '../../../../../hooks';

interface CatalogBundleGridWidgetViewProps extends AutoGridProps {
    hideMainProduct?: boolean;
}

export const CatalogBundleGridWidgetView: FC<CatalogBundleGridWidgetViewProps> = (props) => {
    const { columnCount = 5, children = null, hideMainProduct = false, ...rest } = props;
    const { currentOffer = null } = useCatalogData();
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (elementRef && elementRef.current) elementRef.current.scrollTop = 0;
    }, [currentOffer]);

    if (!currentOffer) return null;

    const mainProduct = hideMainProduct ? currentOffer.product : null;
    const products = mainProduct ? currentOffer.products.filter((product) => product !== mainProduct) : currentOffer.products;

    return (
        <AutoGrid columnCount={columnCount} innerRef={elementRef} {...rest}>
            {products &&
                products.length > 0 &&
                products.map((product, index) => {
                    const iconUrl = GetProductIconUrl(product, currentOffer);

                    return (
                        <LayoutGridItem key={index} itemCount={product.productCount}>
                            {iconUrl && <img alt="" className="octane-catalog-grid-offer-icon" draggable={false} src={iconUrl} />}
                        </LayoutGridItem>
                    );
                })}
            {children}
        </AutoGrid>
    );
};
