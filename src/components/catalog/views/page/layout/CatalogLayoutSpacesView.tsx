import { GetSessionDataManager, Vector3d } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { IPurchasableOffer, LocalizeText } from '../../../../../api';
import { AutoGrid, LayoutRoomPreviewerView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData, useCatalogUiState, useInventoryFurni } from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { groupSpacesOffers, SPACES_GROUPS } from './catalogSpaces.helpers';

const PREVIEW_LIFT = 21;

/**
 * AIR layout_spaces_new_xml with SpacesNewCatalogWidget, in AIR's order but stretched over the whole catalog page: the
 * room preview shows the chosen wallpaper, floor and view together and takes the free height, then the walls / floors
 * / views tabs, the item grid and the purchase row. Each tab keeps its own choice; the page starts on walls with the
 * first of each.
 */
export const CatalogLayoutSpacesView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { setCurrentOffer = null, setPurchaseOptions = null } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();
    const groups = useMemo(() => groupSpacesOffers(page?.offers ?? []), [page]);
    const [groupIndex, setGroupIndex] = useState(0);
    const [chosen, setChosen] = useState<IPurchasableOffer[]>([]);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setGroupIndex(0);
        setChosen(groups.map((group) => group[0] ?? null));
    }, [groups]);

    const selected = chosen[groupIndex] ?? null;

    useEffect(() => {
        if (!selected) return;

        setCurrentOffer?.(selected);
        setPurchaseOptions?.((previous) => ({ ...previous, extraData: selected.product.extraParam, extraParamRequired: true }));
    }, [selected, setCurrentOffer, setPurchaseOptions]);

    useEffect(() => {
        if (gridRef.current) gridRef.current.scrollTop = 0;
    }, [groupIndex]);

    // AIR CatalogWidgetUpdateRoomPreviewEvent: the wallpaper, floor and view of the three tabs at once.
    const [wall, floor, view] = chosen;

    useEffect(() => {
        if (!roomPreviewer) return;

        roomPreviewer.addViewOffset.y = -PREVIEW_LIFT;
        roomPreviewer.centerWallItems = true;
        roomPreviewer.setAutomaticStateChange(false);
        roomPreviewer.reset(true);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
        roomPreviewer.updateObjectRoom(floor?.product.extraParam || 'default', wall?.product.extraParam || 'default', view?.product.extraParam || 'default');

        if (view) {
            const windowFurni = GetSessionDataManager().getWallItemDataByName('window_double_default');

            if (windowFurni) roomPreviewer.addWallItemIntoRoom(windowFurni.id, new Vector3d(90), windowFurni.customParams);
        }

        roomPreviewer.updatePreviewObjectBoundingRectangle();

        return () => {
            roomPreviewer.addViewOffset.y = 0;
        };
    }, [roomPreviewer, wall, floor, view]);

    const offers = groups[groupIndex] ?? [];

    const choose = (offer: IPurchasableOffer) => {
        setChosen((previous) => {
            const next = [...previous];

            next[groupIndex] = offer;

            return next;
        });
    };

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-spaces">
                <div className="octane-catalog-air-spaces__preview">
                    {!!roomPreviewer && <LayoutRoomPreviewerView fitParent roomPreviewer={roomPreviewer} />}
                </div>
                <div className="octane-catalog-air-spaces__tabs" role="tablist">
                    {SPACES_GROUPS.map((group, index) => (
                        <BaseButton
                            key={group.tab}
                            role="tab"
                            aria-selected={groupIndex === index}
                            className={`octane-catalog-air-spaces__tab ${groupIndex === index ? 'is-active' : ''}`}
                            onClick={() => setGroupIndex(index)}
                        >
                            {LocalizeText(`catalog.spaces.tab.${group.tab}`)}
                        </BaseButton>
                    ))}
                </div>
                <div className="octane-catalog-air-spaces__grid">
                    <AutoGrid columnCount={7} columnMinHeight={48} columnMinWidth={48} innerRef={gridRef}>
                        {offers.map((offer) => (
                            <CatalogGridOfferView
                                key={offer.offerId}
                                itemActive={!!currentOffer && currentOffer === offer}
                                offer={offer}
                                selectOffer={choose}
                                inventoryVisible={inventoryVisible}
                            />
                        ))}
                    </AutoGrid>
                </div>
                {!!currentOffer && (
                    <div className="octane-catalog-air-spaces__purchase">
                        <span className="octane-catalog-air-spaces__name">{currentOffer.localizationName}</span>
                        <CatalogTotalPriceWidget alignItems="end" />
                        <CatalogPurchaseWidgetView />
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
