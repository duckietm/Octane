import { FC, useEffect, useRef } from 'react';
import { GetProductIconUrl, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, AutoGridProps, LayoutGridItem } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';

interface CatalogBundleGridWidgetViewProps extends AutoGridProps {
    /** AIR BundleProductContainer: list every product of the bundle except its badges. */
    hideBadges?: boolean;
}

export const CatalogBundleGridWidgetView: FC<CatalogBundleGridWidgetViewProps> = (props) => {
    const { columnCount = 5, children = null, hideBadges = false, ...rest } = props;
    const { currentOffer = null } = useCatalogData();
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (elementRef && elementRef.current) elementRef.current.scrollTop = 0;
    }, [currentOffer]);

    if (!currentOffer) return null;

    const products = hideBadges ? currentOffer.products?.filter((product) => product.productType !== ProductTypeEnum.BADGE) : currentOffer.products;

    return (
        <NativeTextTree>
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
        </NativeTextTree>
    );
};
