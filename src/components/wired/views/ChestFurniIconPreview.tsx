import { GetSessionDataManager } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { localizeWithFallback, ProductTypeEnum } from '../../../api';
import { LayoutFurniImageView, Text } from '../../../common';

interface ChestFurniIconPreviewProps {
    baseItemId: number;
}

// Resolves a furni base item id to its real rendered sprite (LayoutFurniImageView,
// like the official ChestItemIconPreviewer) + its localized furnidata name, and
// flags an unknown id (which the server silently drops). Shared by the furni-chest
// config (WiredChestFurniView) and the chest-has-item-type condition.
export const ChestFurniIconPreview: FC<ChestFurniIconPreviewProps> = ({ baseItemId }) => {
    const furniData = useMemo(() => (baseItemId > 0 ? GetSessionDataManager().getFloorItemData(baseItemId) : null), [baseItemId]);
    const isUnknown = baseItemId > 0 && !furniData;

    return (
        <div className="flex items-center gap-2">
            <div
                className="flex shrink-0 items-center justify-center overflow-hidden bg-black/5"
                style={{ width: 52, height: 52, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4 }}
            >
                {baseItemId > 0 ? (
                    <LayoutFurniImageView productType={ProductTypeEnum.FLOOR} productClassId={baseItemId} direction={2} />
                ) : (
                    <Text small className="text-black/30">
                        ?
                    </Text>
                )}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
                {baseItemId <= 0 ? (
                    <Text small className="text-black/50">
                        {localizeWithFallback('wiredfurni.chest.furni.empty', 'No furni selected')}
                    </Text>
                ) : isUnknown ? (
                    <Text small className="text-[#c0392b]">
                        {localizeWithFallback('wiredfurni.chest.furni.unknown', `Unknown furni (#${baseItemId})`, ['%id%'], [String(baseItemId)])}
                    </Text>
                ) : (
                    <Text bold>{furniData.name}</Text>
                )}
                <Text small className="text-black/40">
                    #{baseItemId}
                </Text>
            </div>
        </div>
    );
};
