import { ColorConverter } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { FaFillDrip } from 'react-icons/fa';
import { IPurchasableOffer, SanitizeHtml } from '../../../../../api';
import { AutoGrid, Button, Column, LayoutGridItem, Text } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export interface CatalogLayoutColorGroupViewProps extends CatalogLayoutProps {}

export const CatalogLayoutColorGroupingView: FC<CatalogLayoutColorGroupViewProps> = (props) => {
    const { page = null } = props;
    const [colorableItems, setColorableItems] = useState<Map<string, number[]>>(new Map<string, number[]>());
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null } = useCatalogUiState();
    const [colorsShowing, setColorsShowing] = useState<boolean>(false);

    const sortByColorIndex = (a: IPurchasableOffer, b: IPurchasableOffer) => {
        if (!a.product.furnitureData.colorIndex || !b.product.furnitureData.colorIndex) {
            return 1;
        }
        if (a.product.furnitureData.colorIndex > b.product.furnitureData.colorIndex) {
            return 1;
        }
        if (a == b) {
            return 0;
        }
        return -1;
    };

    const sortyByFurnitureClassName = (a: IPurchasableOffer, b: IPurchasableOffer) => {
        if (a.product.furnitureData.className > b.product.furnitureData.className) {
            return 1;
        }
        if (a == b) {
            return 0;
        }
        return -1;
    };

    const selectOffer = (offer: IPurchasableOffer) => {
        offer.activate();
        setCurrentOffer(offer);
    };

    const selectColor = (colorIndex: number, productName: string) => {
        const fullName = `${productName}*${colorIndex}`;
        const index = page.offers.findIndex((offer) => offer.product.furnitureData.fullName === fullName);
        if (index > -1) {
            selectOffer(page.offers[index]);
        }
    };

    const offers = useMemo(() => {
        const offers: IPurchasableOffer[] = [];
        const addedColorableItems = new Map<string, boolean>();
        const updatedColorableItems = new Map<string, number[]>();

        page.offers.sort(sortByColorIndex);

        page.offers.forEach((offer) => {
            if (!offer.product) return;

            const furniData = offer.product.furnitureData;

            if (!furniData || !furniData.hasIndexedColor) {
                offers.push(offer);
            } else {
                const name = furniData.className;
                const colorIndex = furniData.colorIndex;

                if (!updatedColorableItems.has(name)) {
                    updatedColorableItems.set(name, []);
                }

                let selectedColor = 0xffffff;

                if (furniData.colors) {
                    for (let color of furniData.colors) {
                        if (color !== 0xffffff) {
                            // skip the white colors
                            selectedColor = color;
                        }
                    }

                    if (updatedColorableItems.get(name).indexOf(selectedColor) === -1) {
                        updatedColorableItems.get(name)[colorIndex] = selectedColor;
                    }
                }

                if (!addedColorableItems.has(name)) {
                    offers.push(offer);
                    addedColorableItems.set(name, true);
                }
            }
        });
        offers.sort(sortyByFurnitureClassName);
        setColorableItems(updatedColorableItems);
        return offers;
    }, [page.offers]);

    return (
        <Column overflow="hidden">
            {/* Top: two visible rows of furni tiles. Tile is 70px tall
               and the AutoGrid handles its own overflow if there are
               more than two rows worth of offers. */}
            <div className="octane-catalog-color-grid-shell shrink-0">
                {(!colorsShowing || !currentOffer || !colorableItems.has(currentOffer.product.furnitureData.className)) && (
                    <AutoGrid columnCount={7} columnMinHeight={70} columnMinWidth={45}>
                        {offers.map((offer, index) => (
                            <CatalogGridOfferView
                                key={index}
                                itemActive={
                                    currentOffer &&
                                    (currentOffer.product.furnitureData.hasIndexedColor
                                        ? currentOffer.product.furnitureData.className === offer.product.furnitureData.className
                                        : currentOffer.offerId === offer.offerId)
                                }
                                offer={offer}
                                selectOffer={selectOffer}
                            />
                        ))}
                    </AutoGrid>
                )}
                {colorsShowing && currentOffer && colorableItems.has(currentOffer.product.furnitureData.className) && (
                    <div className="octane-catalog-color-swatches flex flex-wrap gap-1 p-2 overflow-auto">
                        {colorableItems.get(currentOffer.product.furnitureData.className).map((color, index) => (
                            <LayoutGridItem
                                key={index}
                                itemHighlight
                                className="clear-bg"
                                itemActive={currentOffer.product.furnitureData.colorIndex === index}
                                itemColor={ColorConverter.int2rgb(color)}
                                onClick={(event) => selectColor(index, currentOffer.product.furnitureData.className)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom: preview pane stacked under the grid. Mirrors the
               default-3x3 split (preview on the left, offer info on the
               right) so the rotate/state buttons and Buy/Gift actions
               sit where the user expects. */}
            {!currentOffer && (
                <Column center grow overflow="hidden">
                    {!!page.localization.getImage(1) && <img alt="" src={page.localization.getImage(1)} />}
                    <Text center dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />
                </Column>
            )}
            {currentOffer && (
                <div className="octane-catalog-offer-panel flex flex-col items-center grow overflow-hidden gap-2">
                    <div className="octane-catalog-offer-preview relative flex items-center justify-center overflow-hidden">
                        <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />
                        <CatalogViewProductWidgetView height={348} />
                        <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 inset-e-1" position="absolute" />
                        {currentOffer.product.furnitureData.hasIndexedColor && (
                            <Button className="bottom-1 inset-s-1" position="absolute" onClick={(event) => setColorsShowing((prev) => !prev)}>
                                <FaFillDrip className="fa-icon" />
                            </Button>
                        )}
                    </div>
                    <div className="w-full max-w-[360px] flex flex-col gap-2 px-1">
                        <CatalogLimitedItemWidgetView />
                        <Text truncate>{currentOffer.localizationName}</Text>
                        <div className="flex justify-between items-center">
                            <CatalogSpinnerWidgetView />
                            <CatalogTotalPriceWidget alignItems="end" justifyContent="end" />
                        </div>
                        <CatalogPurchaseWidgetView />
                    </div>
                </div>
            )}
        </Column>
    );
};
