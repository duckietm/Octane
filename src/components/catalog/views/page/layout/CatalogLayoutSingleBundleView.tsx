import { FC } from 'react';
import { GetProductIconUrl, SanitizeHtml } from '../../../../../api';
import { Column, Flex, Grid, Text } from '../../../../../common';
import { useCatalogData } from '../../../../../hooks';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogBundleGridWidgetView } from '../widgets/CatalogBundleGridWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSimplePriceWidgetView } from '../widgets/CatalogSimplePriceWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutSingleBundleView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const mainProduct = currentOffer?.product ?? null;
    const mainIconUrl = mainProduct ? GetProductIconUrl(mainProduct, currentOffer) : null;
    const hasDetails = !!page.localization.getText(1);

    return (
        <>
            <CatalogFirstProductSelectorWidgetView />
            <Grid style={{ gridTemplateRows: hasDetails ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto' }}>
                {hasDetails && (
                    <div className="col-span-12 octane-catalog-bundle-details">
                        <Text small>{page.localization.getText(1)}</Text>
                    </div>
                )}
                <Column gap={1} overflow="hidden" size={5}>
                    {!!page.localization.getText(2) && (
                        <>
                            <Text
                                aria-hidden
                                className="octane-catalog-bundle-header-spacer"
                                dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(2)) }}
                            />
                            <Text
                                aria-hidden
                                className="octane-catalog-bundle-header-spacer"
                                dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(2)) }}
                            />
                        </>
                    )}
                    <Flex alignItems="center" gap={2}>
                        {mainIconUrl && (
                            <div className="octane-catalog-bundle-main-item">
                                <img alt="" className="octane-catalog-grid-offer-icon" draggable={false} src={mainIconUrl} />
                            </div>
                        )}
                        <div className="octane-catalog-bundle-price">
                            <CatalogSimplePriceWidgetView />
                        </div>
                    </Flex>
                    <Column grow gap={0} overflow="hidden" position="relative">
                        {!!page.localization.getImage(1) && <img alt="" className="w-full h-full object-contain object-top" src={page.localization.getImage(1)} />}
                        <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-0 inset-s-0" position="absolute" />
                    </Column>
                </Column>
                <Column gap={1} overflow="hidden" size={7}>
                    {!!page.localization.getText(2) && (
                        <Text
                            aria-hidden
                            className="octane-catalog-bundle-header-spacer"
                            dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(2)) }}
                        />
                    )}
                    {!!page.localization.getText(2) && <Text dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(2)) }} />}
                    <Column className="octane-catalog-bundle-frame has-classic-scrollbar" overflow="hidden">
                        <CatalogBundleGridWidgetView hideMainProduct fullWidth className="octane-catalog-layout-bundle-grid" columnCount={4} />
                    </Column>
                </Column>
                <div className="col-span-12 octane-catalog-bundle-actions">
                    <CatalogPurchaseWidgetView />
                </div>
            </Grid>
        </>
    );
};
