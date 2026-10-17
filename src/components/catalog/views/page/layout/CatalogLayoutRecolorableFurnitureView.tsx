import { ColorConverter, GetRoomEngine, GetSessionDataManager, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import {
    distinctRecolors,
    formatRecolor,
    IPurchasableOffer,
    isRecolorableClass,
    localizeWithFallback,
    NO_RECOLOR,
    recolorablePalette,
    recolorHex
} from '../../../../../api';
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
import { Select } from '../../../../../common/Select';

/** The colours of the recolourable furni in the active room. */
const roomRecolors = (): number[] =>
{
    const roomId = GetRoomEngine().activeRoomId;

    if (roomId < 0) return [];

    return distinctRecolors(
        GetRoomEngine()
            .getRoomObjects(roomId, RoomObjectCategory.FLOOR)
            .filter((object) =>
            {
                const typeId = object?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0;

                return typeId > 0 && isRecolorableClass(GetSessionDataManager().getFloorItemData(typeId)?.className);
            })
            .map((object) => object.model?.getValue<{ [key: string]: string }>(RoomObjectVariable.FURNITURE_DATA))
    );
};

interface RecolorableColorWindowProps
{
    offer: IPurchasableOffer;
    color: number;
    everyShape: boolean;
    setEveryShape: (everyShape: boolean) => void;
    apply: (color: number) => void;
    onClose: () => void;
}

const RecolorableColorWindow: FC<RecolorableColorWindowProps> = ({ offer, color, everyShape, setEveryShape, apply, onClose }) =>
{
    const [pending, setPending] = useState(NO_RECOLOR);
    const [, setTick] = useState(0);
    const className = offer?.product?.furnitureData?.className ?? null;
    const palette = useMemo(() => recolorablePalette(className), [className]);
    const target = pending === NO_RECOLOR ? color : pending;

    useEffect(() =>
    {
        const interval = setInterval(() => setTick((value) => value + 1), 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => setPending(NO_RECOLOR), [className]);

    const swatches = (colors: number[]) =>
        colors.map((swatch) => (
            <LayoutColorSwatchView
                key={swatch}
                active={swatch === target}
                color={ColorConverter.int2rgb(swatch)}
                title={recolorHex(swatch)}
                onClick={() => setPending(swatch)}
            />
        ));
    const preview = (previewColor: number) => (
        <div className="octane-color-preview-box">
            {offer?.product && <LayoutFurniImageView productClassId={offer.product.productClassId} productType={offer.product.productType} recolor={previewColor} />}
        </div>
    );

    return (
        <OctaneCardView className="octane-builders-blocks-colors" offsetLeft={420} theme="primary-slim" uniqueKey="catalog-recolorable-colors">
            <OctaneCardHeaderView headerText={localizeWithFallback('catalog.choosecolour', 'Choose color')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.preview', 'Preview')}
                </Text>
                <div className="flex items-center justify-center gap-3">
                    {preview(color)}
                    <FaArrowRight className="octane-color-preview-arrow" />
                    {preview(target)}
                </div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.palette', 'Palette')}
                </Text>
                <div className="octane-color-swatch-grid">{swatches(palette)}</div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.room_colors', 'Colors in this room')}
                </Text>
                <div className="octane-color-swatch-grid is-room">{swatches(roomRecolors().filter((swatch) => palette.includes(swatch)))}</div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.scope', 'Apply to:')}
                </Text>
                <div className="flex items-center gap-2">
                    <Select
                        className="form-select form-select-sm grow"
                        value={everyShape ? 'all' : 'this'}
                        onChange={(event) => setEveryShape(event.target.value === 'all')}
                    >
                        <option value="this">{localizeWithFallback('builder.palette.apply_to.this', 'Only this furni')}</option>
                        <option value="all">{localizeWithFallback('builder.palette.apply_to.all', 'On multiple furni')}</option>
                    </Select>
                    <Button
                        disabled={target === NO_RECOLOR || (target === color && !everyShape)}
                        variant="success"
                        onClick={() =>
                        {
                            apply(target);
                            setPending(NO_RECOLOR);
                        }}
                    >
                        {localizeWithFallback('furniture.recolor.apply', 'Apply')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

/**
 * Builders Club page for the recolourable furni (recolorable_furniture), in the colour grouping style:
 * the preview on top and one tile per furni. Picking a furni opens a window with its palette; the colour
 * goes to that furni only or to every furni on the page. The preview and the furni on the cursor take
 * the colour, and the placement sends it as "R,G,B"; it stays picked per furni for the session.
 */
export const CatalogLayoutRecolorableFurnitureView: FC<CatalogLayoutProps> = (props) =>
{
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null, setPurchaseOptions = null } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();
    const colors = useRecolorableColorStore((state) => state.colors);
    const setColor = useRecolorableColorStore((state) => state.setColor);
    const [colorsOpen, setColorsOpen] = useState(false);
    const [everyShape, setEveryShape] = useState(false);

    const offers = page?.offers ?? [];
    const onPage = !!currentOffer && offers.includes(currentOffer);
    const className = currentOffer?.product?.furnitureData?.className ?? null;
    const recolorable = isRecolorableClass(className);
    const palette = useMemo(() => (recolorable ? recolorablePalette(className) : []), [recolorable, className]);
    const color = recolorable ? pickRecolorableColor(colors, className, palette) : NO_RECOLOR;

    const selectOffer = (offer: IPurchasableOffer) =>
    {
        if (!offer || !setCurrentOffer) return;

        offer.activate();
        setCurrentOffer(offer);
    };

    const selectShape = (offer: IPurchasableOffer) =>
    {
        selectOffer(offer);
        setColorsOpen(isRecolorableClass(offer?.product?.furnitureData?.className));
    };

    const apply = (rgb: number) =>
    {
        if (!everyShape)
        {
            setColor(className, rgb);
            return;
        }

        // Every furni on the page whose palette has the colour takes it.
        for (const offer of offers)
        {
            const offerClass = offer?.product?.furnitureData?.className;

            if (isRecolorableClass(offerClass) && recolorablePalette(offerClass).includes(rgb)) setColor(offerClass, rgb);
        }
    };

    // The first furni is shown when the page opens, as in Habbo.
    useEffect(() =>
    {
        if (onPage || !offers.length || !setCurrentOffer) return;

        offers[0].activate();
        setCurrentOffer(offers[0]);
    }, [offers, onPage, setCurrentOffer]);

    useEffect(() =>
    {
        if (!currentOffer || !setPurchaseOptions || color === NO_RECOLOR) return;

        setPurchaseOptions((previous) => ({ ...previous, extraData: formatRecolor(color), previewStuffData: recolorableObjectData(color) }));
    }, [currentOffer, color, setPurchaseOptions]);

    return (
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
                            selectOffer={() => selectShape(offer)}
                            inventoryVisible={inventoryVisible}
                        />
                    ))}
                </AutoGrid>
            </div>
            {currentOffer && (
                <div className="octane-catalog-builders-blocks-actions">
                    <CatalogPurchaseWidgetView />
                </div>
            )}
            {colorsOpen && recolorable && (
                <RecolorableColorWindow
                    apply={apply}
                    color={color}
                    everyShape={everyShape}
                    offer={currentOffer}
                    setEveryShape={setEveryShape}
                    onClose={() => setColorsOpen(false)}
                />
            )}
        </Column>
    );
};
