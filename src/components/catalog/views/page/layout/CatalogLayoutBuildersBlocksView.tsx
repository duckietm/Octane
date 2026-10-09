import { ColorConverter, GetRoomEngine, GetSessionDataManager, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { IPurchasableOffer, localizeWithFallback } from '../../../../../api';
import {
    AutoGrid,
    Button,
    Column,
    LayoutColorSwatchView,
    LayoutFurniImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView,
    Text
} from '../../../../../common';
import { useCatalogData, useCatalogUiState, useInventoryFurni } from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import {
    blockColorOf,
    BuildersBlockFamily,
    groupBlockFamilies,
    NO_BLOCK_COLORS,
    pickBlockColor,
    pickVariant,
    roomColorIndexes,
    swatchColor
} from './buildersBlocks.helpers';

interface BuildersBlocksColorWindowProps
{
    family: BuildersBlockFamily;
    families: BuildersBlockFamily[];
    currentOffer: IPurchasableOffer;
    everyShape: boolean;
    setEveryShape: (everyShape: boolean) => void;
    pickColor: (offer: IPurchasableOffer) => void;
    onClose: () => void;
}

const roomFloorFurni = () =>
{
    const roomId = GetRoomEngine().activeRoomId;

    if (roomId < 0) return [];

    return GetRoomEngine()
        .getRoomObjects(roomId, RoomObjectCategory.FLOOR)
        .map((object) => GetSessionDataManager().getFloorItemData(object?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0));
};

const BuildersBlocksColorWindow: FC<BuildersBlocksColorWindowProps> = ({
    family,
    families,
    currentOffer,
    everyShape,
    setEveryShape,
    pickColor,
    onClose
}) =>
{
    const [pending, setPending] = useState<IPurchasableOffer>(null);
    const [, setTick] = useState(0);
    const target = (pending?.product?.furnitureData?.className === family.className ? pending : null) ?? currentOffer;
    const targetColor = target?.product?.furnitureData?.colorIndex ?? -1;

    useEffect(() =>
    {
        const interval = setInterval(() => setTick((value) => value + 1), 500);

        return () => clearInterval(interval);
    }, []);

    const swatches = (indexes: number[]) =>
        indexes
            .filter((index) => family.variants.has(index))
            .map((index) =>
            {
                const offer = family.variants.get(index);

                return (
                    <LayoutColorSwatchView
                        key={index}
                        active={index === targetColor}
                        color={ColorConverter.int2rgb(swatchColor(offer))}
                        title={offer?.localizationName}
                        onClick={() => setPending(offer)}
                    />
                );
            });
    const preview = (offer: IPurchasableOffer) => (
        <div className="octane-color-preview-box">
            {offer?.product && <LayoutFurniImageView productClassId={offer.product.productClassId} productType={offer.product.productType} />}
        </div>
    );

    return (
        <OctaneCardView className="octane-builders-blocks-colors" offsetLeft={420} theme="primary-slim" uniqueKey="catalog-builders-blocks-colors">
            <OctaneCardHeaderView headerText={localizeWithFallback('catalog.choosecolour', 'Choose color')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.preview', 'Preview')}
                </Text>
                <div className="flex items-center justify-center gap-3">
                    {preview(currentOffer)}
                    <FaArrowRight className="octane-color-preview-arrow" />
                    {preview(target)}
                </div>
                <Text bold small>
                    {localizeWithFallback('builder.palette.title', 'Palette')}
                </Text>
                <div className="octane-color-swatch-grid">{swatches(family.colorIndexes)}</div>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.room_colors', 'Colors in this room')}
                </Text>
                <div className="octane-color-swatch-grid is-room">{swatches(roomColorIndexes(family, families, roomFloorFurni()))}</div>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.apply_to', 'Apply to:')}
                </Text>
                <div className="flex items-center gap-2">
                    <select
                        className="form-select form-select-sm grow"
                        value={everyShape ? 'all' : 'this'}
                        onChange={(event) => setEveryShape(event.target.value === 'all')}
                    >
                        <option value="this">{localizeWithFallback('builder.palette.apply_to.this', 'Only this furni')}</option>
                        <option value="all">{localizeWithFallback('builder.palette.apply_to.all', 'On multiple furni')}</option>
                    </select>
                    <Button disabled={!target || (target === currentOffer && !everyShape)} variant="success" onClick={() =>
                    {
                        pickColor(target);
                        setPending(null);
                    }}>
                        {localizeWithFallback('builder.recolor.apply', 'Apply')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

/**
 * Habbo's Builders Club building blocks page: the preview on top and one tile per shape. Picking a shape
 * opens a second window with its colours, which go to that shape only or to every shape on the page.
 */
export const CatalogLayoutBuildersBlocksView: FC<CatalogLayoutProps> = (props) =>
{
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();
    const families = useMemo(() => groupBlockFamilies(page?.offers ?? []), [page?.offers]);
    const [colorsOpen, setColorsOpen] = useState(false);
    const [colors, setColors] = useState(NO_BLOCK_COLORS);
    const [everyShape, setEveryShape] = useState(false);

    const currentClassName = currentOffer?.product?.furnitureData?.className ?? null;
    const currentFamily = families.find((family) => family.className === currentClassName) ?? null;

    const selectOffer = (offer: IPurchasableOffer) =>
    {
        if (!offer) return;

        offer.activate();
        setCurrentOffer(offer);
    };

    const selectShape = (offer: IPurchasableOffer) =>
    {
        selectOffer(offer);
        setColorsOpen(true);
    };

    const pickColor = (offer: IPurchasableOffer) =>
    {
        const furniData = offer?.product?.furnitureData;

        if (!furniData) return;

        setColors(pickBlockColor(colors, furniData.className, furniData.colorIndex, everyShape));
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
                                selectOffer={() => selectShape(offer)}
                                inventoryVisible={inventoryVisible}
                            />
                        );
                    })}
                </AutoGrid>
            </div>
            {currentOffer && (
                <div className="octane-catalog-builders-blocks-actions">
                    <CatalogPurchaseWidgetView />
                </div>
            )}
            {colorsOpen && currentFamily && (
                <BuildersBlocksColorWindow
                    currentOffer={currentOffer}
                    family={currentFamily}
                    everyShape={everyShape}
                    families={families}
                    pickColor={pickColor}
                    setEveryShape={setEveryShape}
                    onClose={() => setColorsOpen(false)}
                />
            )}
        </Column>
    );
};
