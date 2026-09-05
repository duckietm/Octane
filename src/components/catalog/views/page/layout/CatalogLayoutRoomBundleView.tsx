import { FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { Column, Flex, Grid, Text } from '../../../../../common';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogBundleGridWidgetView } from '../widgets/CatalogBundleGridWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSimplePriceWidgetView } from '../widgets/CatalogSimplePriceWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutRoomBundleView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
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
                        <div className="octane-catalog-bundle-price octane-catalog-bundle-price--room">
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
                        <CatalogBundleGridWidgetView fullWidth className="octane-catalog-layout-bundle-grid" columnCount={4} />
                    </Column>
                </Column>
                <div className="col-span-12 octane-catalog-bundle-actions">
                    <CatalogPurchaseWidgetView />
                </div>
            </Grid>
        </>
    );
};
