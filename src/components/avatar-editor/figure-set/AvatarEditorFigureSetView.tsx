import { FC } from 'react';
import { IAvatarEditorCategory, IAvatarEditorCategoryPartItem } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useAvatarEditor } from '../../../hooks';
import { useIsHandheld } from '../../../hooks/handheld/useHandheldLayout';
import { InfiniteGrid } from '../../../layout';
import { AvatarEditorFigureSetItemView } from './AvatarEditorFigureSetItemView';

/** The phone's part grid: tiles across, the space between them and a row's height with that space (HandheldLooks.css). */
const HANDHELD_COLUMNS = 5;
const HANDHELD_GAP = 6;
const HANDHELD_ROW = 66;

export const AvatarEditorFigureSetView: FC<{
    category: IAvatarEditorCategory;
    columnCount: number;
    estimateSize?: number;
}> = (props) => {
    const { category = null, columnCount = 3, estimateSize = 50 } = props;
    const { selectedParts = null, selectEditorPart } = useAvatarEditor();
    // Phone layout: five finger-sized tiles across with room between them, scrolled by the finger (no AIR scrollbar).
    const isHandheld = useIsHandheld();

    const isPartItemSelected = (partItem: IAvatarEditorCategoryPartItem) => {
        if (!category || !category.setType || !selectedParts) return false;

        if (!selectedParts[category.setType]) {
            if (partItem.isClear) return true;

            return false;
        }

        const partId = selectedParts[category.setType];

        return partId === partItem.id;
    };

    return (
        <NativeTextTree>
            <InfiniteGrid<IAvatarEditorCategoryPartItem>
                classicScrollbar={!isHandheld}
                columnCount={isHandheld ? HANDHELD_COLUMNS : columnCount}
                columnGap={isHandheld ? HANDHELD_GAP : 0}
                rowGap={isHandheld ? HANDHELD_GAP : 0}
                estimateSize={isHandheld ? HANDHELD_ROW : estimateSize}
                itemRender={(item: IAvatarEditorCategoryPartItem) => {
                    if (!item) return null;

                    return (
                        <AvatarEditorFigureSetItemView
                            isSelected={isPartItemSelected(item)}
                            partItem={item}
                            setType={category.setType}
                            onClick={(event) => selectEditorPart(category.setType, item.partSet?.id ?? -1)}
                        />
                    );
                }}
                items={category.partItems}
                overscan={isHandheld ? HANDHELD_COLUMNS : columnCount}
            />
        </NativeTextTree>
    );
};
