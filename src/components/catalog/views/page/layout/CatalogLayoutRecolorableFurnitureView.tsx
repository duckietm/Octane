import { CSSProperties, FC, useEffect, useMemo } from 'react';
import {
    formatRecolor,
    IPurchasableOffer,
    isRecolorableClass,
    localizeWithFallback,
    NO_RECOLOR,
    recolorablePalette,
    recolorHex,
    recolorPageColors
} from '../../../../../api';
import { AutoGrid, Column, Text } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import {
    pickRecolorableColor,
    recolorableObjectData,
    useCatalogData,
    useCatalogUiState,
    useInventoryFurni,
    useRecolorableColorStore
} from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/**
 * AIR's layout_recolorable_furniture (Builders Club): the preview (150 px), the furni grid, then the palette of the
 * picked furni inline under it (`catalog.recolorable.palette`, 27 x 22 swatches) and the builder widget. A colour goes
 * to every furni on the page; the preview and the furni on the cursor take it and the placement sends it as "R,G,B".
 */
export const CatalogLayoutRecolorableFurnitureView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null, setPurchaseOptions = null } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();
    const colors = useRecolorableColorStore((state) => state.colors);
    const setColor = useRecolorableColorStore((state) => state.setColor);

    const offers = page?.offers ?? [];
    const onPage = !!currentOffer && offers.includes(currentOffer);
    const className = currentOffer?.product?.furnitureData?.className ?? null;
    const recolorable = isRecolorableClass(className);
    const palette = useMemo(() => (recolorable ? recolorablePalette(className) : []), [recolorable, className]);
    const color = recolorable ? pickRecolorableColor(colors, className, palette) : NO_RECOLOR;

    const selectOffer = (offer: IPurchasableOffer) => {
        if (!offer || !setCurrentOffer) return;

        offer.activate();
        setCurrentOffer(offer);
    };

    const pickColor = (rgb: number) => {
        const classNames = offers.map((offer: IPurchasableOffer) => offer?.product?.furnitureData?.className).filter(Boolean);

        for (const [offerClass, offerColor] of recolorPageColors(classNames, rgb)) setColor(offerClass, offerColor);
    };

    // The first furni is shown when the page opens, as in Habbo.
    useEffect(() => {
        if (onPage || !offers.length || !setCurrentOffer) return;

        offers[0].activate();
        setCurrentOffer(offers[0]);
    }, [offers, onPage, setCurrentOffer]);

    useEffect(() => {
        if (!currentOffer || !setPurchaseOptions || color === NO_RECOLOR) return;

        setPurchaseOptions((previous) => ({ ...previous, extraData: formatRecolor(color), previewStuffData: recolorableObjectData(color) }));
    }, [currentOffer, color, setPurchaseOptions]);

    return (
        <NativeTextTree>
            <Column className="octane-catalog-builders-blocks octane-catalog-recolorable" gap={1} overflow="hidden">
                <div className="octane-catalog-builders-blocks-preview relative flex items-center justify-center overflow-hidden">
                    {currentOffer && (
                        <>
                            <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />
                            <CatalogViewProductWidgetView height={150} />
                            <Text bold className="octane-catalog-builders-blocks-name" truncate>
                                {currentOffer.localizationName}
                            </Text>
                        </>
                    )}
                </div>
                <div className="octane-catalog-builders-blocks-shapes">
                    <AutoGrid columnCount={7} columnMinHeight={50} columnMinWidth={45}>
                        {offers.map((offer) => (
                            <CatalogGridOfferView
                                key={offer.offerId}
                                itemActive={offer === currentOffer}
                                offer={offer}
                                selectOffer={() => selectOffer(offer)}
                                inventoryVisible={inventoryVisible}
                            />
                        ))}
                    </AutoGrid>
                </div>
                <div className="octane-catalog-recolorable-palette">
                    <span className="octane-catalog-recolorable-palette-caption">{localizeWithFallback('catalog.recolorable.palette', 'Palette')}</span>
                    <div
                        aria-label={localizeWithFallback('catalog.recolorable.palette', 'Palette')}
                        className="octane-catalog-recolorable-palette-box"
                        role="radiogroup"
                    >
                        {palette.map((swatch) => (
                            <BaseButton
                                key={swatch}
                                aria-checked={swatch === color}
                                aria-label={recolorHex(swatch)}
                                className={`octane-catalog-recolorable-swatch${swatch === color ? ' is-chosen' : ''}`}
                                role="radio"
                                style={{ '--swatch-color': recolorHex(swatch) } as CSSProperties}
                                onClick={() => pickColor(swatch)}
                            />
                        ))}
                    </div>
                </div>
                <div className="octane-catalog-builders-blocks-actions">{currentOffer && <CatalogPurchaseWidgetView />}</div>
            </Column>
        </NativeTextTree>
    );
};
