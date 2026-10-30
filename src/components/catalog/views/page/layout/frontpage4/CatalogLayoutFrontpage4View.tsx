import { CreateLinkEvent, FrontPageItem } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef } from 'react';
import { GetConfigurationValue } from '../../../../../../api';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../../hooks';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';

/** One featured item (AIR featured_item_template / firstitem): the promo image with its title in a bar at the bottom. */
const FeaturedItem: FC<{ item: FrontPageItem; className: string; onSelect: (item: FrontPageItem) => void }> = ({ item, className, onSelect }) => {
    const imageUrl = `${GetConfigurationValue<string>('image.library.url', '')}${item.itemPromoImage}`;

    return (
        <NativeTextTree>
            <BaseButton className={className} style={{ backgroundImage: `url(${imageUrl})` }} onClick={() => onSelect(item)}>
                <span className="octane-catalog-air-frontpage__title">{item.itemName}</span>
            </BaseButton>
        </NativeTextTree>
    );
};

/**
 * AIR layout_frontpage_featured_xml (frontpage4 uses it too), stretched over the whole catalog page: the first featured
 * item as the tall 184 px picture on the left, every other featured item in a scrolling list beside it (each keeps
 * AIR's 360 x 126 proportions at the list's width), and under the list the voucher box with its label (`ctlg_txt2`,
 * text 1). The navigation is hidden on this page.
 */
export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = (props) => {
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalogData();
    const [firstItem, ...otherItems] = frontPageItems;

    const selectItem = useCallback((item: FrontPageItem) => {
        switch (item.type) {
            case FrontPageItem.ITEM_CATALOGUE_PAGE:
                CreateLinkEvent(`catalog/open/${item.catalogPageLocation}`);
                return;
            case FrontPageItem.ITEM_PRODUCT_OFFER:
                CreateLinkEvent(`catalog/open/${item.productOfferId}`);
                return;
        }
    }, []);

    // Hide it when this page opens, not on every render: while the next tab's page is still loading this page re-renders
    // after the click that showed the navigation again, and must not hide it a second time.
    const hideNavigationRef = useRef(hideNavigation);

    hideNavigationRef.current = hideNavigation;

    useEffect(() => {
        hideNavigationRef.current?.();
    }, [page]);

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-frontpage">
                {!!firstItem && <FeaturedItem className="octane-catalog-air-frontpage__first" item={firstItem} onSelect={selectItem} />}
                <div className="octane-catalog-air-frontpage__list">
                    {otherItems.map((item, index) => (
                        <FeaturedItem key={`${item.itemName}-${index}`} className="octane-catalog-air-frontpage__item" item={item} onSelect={selectItem} />
                    ))}
                </div>
                <div className="octane-catalog-air-frontpage__voucher">
                    <div className="octane-catalog-air-frontpage__voucher-label">{page?.localization?.getText(1) ?? ''}</div>
                    <CatalogRedeemVoucherView text="" />
                </div>
            </div>
        </NativeTextTree>
    );
};
