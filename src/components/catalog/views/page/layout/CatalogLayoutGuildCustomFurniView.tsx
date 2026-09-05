import { StringDataType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaExchangeAlt, FaSyncAlt } from 'react-icons/fa';
import { Column } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogGuildBadgeWidgetView } from '../widgets/CatalogGuildBadgeWidgetView';
import { CatalogGuildFurniRecolorFilter } from '../widgets/CatalogGuildFurniRecolorFilter';
import { CatalogGuildSelectorWidgetView } from '../widgets/CatalogGuildSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayouGuildCustomFurniView: FC<CatalogLayoutProps> = () => {
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: groups = null } = useUserGroups();
    const hasGroups = !!(groups && groups.length);
    const [groupColors, setGroupColors] = useState<{ colorA: string; colorB: string } | null>(null);

    useEffect(() => {
        const previewStuffData = purchaseOptions?.previewStuffData ?? null;

        if (!previewStuffData) return;

        const colorA = (previewStuffData as StringDataType).getValue(3);
        const colorB = (previewStuffData as StringDataType).getValue(4);

        if (!colorA || !colorA.length) return;

        const next = { colorA, colorB: colorB && colorB.length ? colorB : colorA };

        setGroupColors((prev) => (prev && prev.colorA === next.colorA && prev.colorB === next.colorB ? prev : next));
    }, [purchaseOptions]);

    const tintColor = useMemo(() => {
        if (!groupColors) return null;

        const { colorA, colorB } = groupColors;

        if (colorB && colorB !== colorA) return `linear-gradient(90deg, #${colorA} 0 50%, #${colorB} 50% 100%)`;

        return `#${colorA}`;
    }, [groupColors]);

    return (
        <>
            {!!groupColors && <CatalogGuildFurniRecolorFilter colorA={groupColors.colorA} colorB={groupColors.colorB} />}
            <CatalogFirstProductSelectorWidgetView />
            <Column fullHeight gap={1} overflow="hidden">
                {!!currentOffer && (
                    <div className="relative shrink-0 overflow-hidden">
                        <button
                            aria-label="Rotate preview"
                            className="octane-catalog-preview-btn octane-catalog-preview-rotate"
                            type="button"
                            onClick={() => roomPreviewer?.changeRoomObjectDirection()}
                        >
                            <FaSyncAlt />
                        </button>
                        <button
                            aria-label="Change preview state"
                            className="octane-catalog-preview-btn octane-catalog-preview-state"
                            type="button"
                            onClick={() => roomPreviewer?.changeRoomObjectState()}
                        >
                            <FaExchangeAlt />
                        </button>
                        <CatalogViewProductWidgetView height={210} />
                        <div className="absolute bottom-1 left-1 z-10">
                            <CatalogGuildBadgeWidgetView />
                        </div>
                        <div className="octane-catalog-preview-price absolute bottom-1 right-1">
                            <CatalogTotalPriceWidget alignItems="end" />
                        </div>
                    </div>
                )}
                <div className="grow! min-h-0 overflow-auto">
                    <CatalogItemGridWidgetView className="octane-catalog-grid" columnCount={6} columnMinHeight={80} columnMinWidth={55} tintColor={tintColor} />
                </div>
                {!!currentOffer && (
                    <div className="flex shrink-0 flex-col gap-1">
                        <CatalogGuildSelectorWidgetView />
                        {hasGroups && <CatalogPurchaseWidgetView noGiftOption={true} />}
                    </div>
                )}
            </Column>
        </>
    );
};
