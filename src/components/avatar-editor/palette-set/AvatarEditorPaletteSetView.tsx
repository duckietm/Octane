import { IPartColor } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { IAvatarEditorCategory } from '../../../api';
import { useAvatarEditor } from '../../../hooks';
import { AvatarEditorPaletteSetItem } from './AvatarEditorPaletteSetItemView';

export const AvatarEditorPaletteSetView: FC<{
    category: IAvatarEditorCategory;
    paletteIndex: number;
    columnCount: number;
}> = (props) => {
    const { category = null, paletteIndex = -1, columnCount = 3 } = props;
    const { selectedColorParts = null, selectEditorColor = null } = useAvatarEditor();

    const isPartColorSelected = (partColor: IPartColor) => {
        if (
            !category ||
            !category.setType ||
            !selectedColorParts ||
            !selectedColorParts[category.setType] ||
            !selectedColorParts[category.setType][paletteIndex]
        )
            return false;

        const selectedColorPart = selectedColorParts[category.setType][paletteIndex];

        return selectedColorPart.id === partColor.id;
    };

    return (
        <div className="avatar-editor-palette-grid" style={{ '--avatar-editor-palette-columns': columnCount } as CSSProperties}>
            {category.colorItems[paletteIndex].map((item) => (
                <AvatarEditorPaletteSetItem
                    key={item.id}
                    isSelected={isPartColorSelected(item)}
                    partColor={item}
                    onClick={() => selectEditorColor(category.setType, paletteIndex, item.id)}
                />
            ))}
        </div>
    );
};
