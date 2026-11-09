import { ColorConverter } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { IPurchasableOffer, localizeWithFallback } from '../../../../../api';
import { AutoGrid, Column, LayoutColorSwatchView, Text } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useInventoryFurni } from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { blockColorOf, groupBlockFamilies, NO_BLOCK_COLORS, pickBlockColor, pickVariant, swatchColor } from './buildersBlocks.helpers';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

/**
 * Builders Club colour grouping page for the old colour variants (bc_x*N): the preview on top, one
 * tile per shape and the shape's colours below it. Picking a colour selects that variant.
 */
export const CatalogLayoutBuildersBlocksView: FC<CatalogLayoutProps> = (props) =>
{
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();
    const families = useMemo(() => groupBlockFamilies(page?.offers ?? []), [page?.offers]);
    const [colors, setColors] = useState(NO_BLOCK_COLORS);

    const currentClassName = currentOffer?.product?.furnitureData?.className ?? null;
    const currentColor = currentOffer?.product?.furnitureData?.colorIndex ?? -1;
    const currentFamily = families.find((family) => family.className === currentClassName) ?? null;

    const selectOffer = (offer: IPurchasableOffer) =>
    {
        if (!offer || !setCurrentOffer) return;

        offer.activate();
        setCurrentOffer(offer);
    };

    const pickColor = (offer: IPurchasableOffer) =>
    {
        const furniData = offer?.product?.furnitureData;

        if (!furniData) return;

        setColors(pickBlockColor(colors, furniData.className, furniData.colorIndex, false));
        selectOffer(offer);
    };

    // The first shape is shown when the page opens, as in Habbo.
    useEffect(() =>
    {
        if (currentFamily || !families.length || !setCurrentOffer) return;

        const first = pickVariant(families[0], -1);

        if (!first) return;

        first.activate();
        setCurrentOffer(first);
    }, [families, currentFamily, setCurrentOffer]);

    return (
        <NativeTextTree>
            <Column className="octane-catalog-builders-blocks" gap={1} overflow="hidden">
                <div className="octane-catalog-builders-blocks-preview relative flex items-center justify-center overflow-hidden">
                    {currentOffer && (
                        <>
                            <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />
                            <CatalogViewProductWidgetView height={190} />
                            <Text bold className="octane-catalog-builders-blocks-name" truncate>
                                {currentOffer.localizationName}
                            </Text>
                        </>
                    )}
                </div>
                <div className="octane-catalog-builders-blocks-shapes">
                    <AutoGrid columnCount={7} columnMinHeight={50} columnMinWidth={45}>
                        {families.map((family) =>
                        {
                            const offer = pickVariant(family, blockColorOf(colors, family.className));

                            return (
                                <CatalogGridOfferView
                                    key={family.className}
                                    itemActive={family.className === currentClassName}
                                    offer={offer}
                                    selectOffer={() => selectOffer(offer)}
                                    inventoryVisible={inventoryVisible}
                                />
                            );
                        })}
                    </AutoGrid>
                </div>
                {currentFamily && currentFamily.colorIndexes.length > 1 && (
                    <div className="octane-catalog-recolorable-palette">
                        <Text bold small>
                            {localizeWithFallback('catalog.recolorable.palette', 'Palette')}
                        </Text>
                        <div className="octane-color-swatch-grid">
                            {currentFamily.colorIndexes.map((index) =>
                            {
                                const offer = currentFamily.variants.get(index);

                                return (
                                    <LayoutColorSwatchView
                                        key={index}
                                        active={index === currentColor}
                                        color={ColorConverter.int2rgb(swatchColor(offer))}
                                        title={offer?.localizationName}
                                        onClick={() => pickColor(offer)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
                {currentOffer && (
                    <div className="octane-catalog-builders-blocks-actions">
                        <CatalogPurchaseWidgetView />
                    </div>
                )}
            </Column>
        </NativeTextTree>
    );
};
