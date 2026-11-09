import { FC, useMemo } from 'react';
import { Base } from '../Base';
import { BaseButton } from '../BaseButton';
import { Column, ColumnProps } from '../Column';
import { LayoutItemCountView } from './LayoutItemCountView';
import { LayoutLimitedEditionStyledNumberView } from './limited-edition';

export interface LayoutGridItemProps extends ColumnProps {
    itemImage?: string;
    itemColor?: string;
    itemActive?: boolean;
    itemCount?: number;
    itemCountMinimum?: number;
    itemUniqueSoldout?: boolean;
    itemUniqueNumber?: number;
    itemUnseen?: boolean;
    itemHighlight?: boolean;
    disabled?: boolean;
}

export const LayoutGridItem: FC<LayoutGridItemProps> = (props) => {
    const {
        itemImage = undefined,
        itemColor = undefined,
        itemActive = false,
        itemCount = 1,
        itemCountMinimum = 1,
        itemUniqueSoldout = false,
        itemUniqueNumber = -2,
        itemUnseen = false,
        itemHighlight = false,
        disabled = false,
        center = true,
        column = true,
        style = {},
        classNames = [],
        position = 'relative',
        overflow = 'hidden',
        children = null,
        component = undefined,
        ...rest
    } = props;

    // A clickable item is a real button, so it takes Tab focus and Enter / Space. Pass component="div" for items that
    // hold their own interactive children (a button in a button is invalid) or are drawn by a wrapper that owns the role.
    const isClickable = !!(rest.onClick || rest.onMouseDown || rest.onMouseUp || rest.onDoubleClick);
    const itemComponent = component ?? (isClickable ? BaseButton : 'div');
    const isButton = itemComponent === BaseButton;
    const hasOwnSemantics = rest['aria-pressed'] !== undefined || rest['aria-selected'] !== undefined || rest.role !== undefined;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['layout-grid-item'];

        if (itemActive) newClassNames.push('is-grid-active', 'bg-[#e4e7df]!');

        if (itemUniqueSoldout || itemUniqueNumber > 0) newClassNames.push('unique-item');

        if (itemUniqueSoldout) newClassNames.push('sold-out');

        if (itemUnseen) newClassNames.push('unseen');

        if (itemHighlight) newClassNames.push('has-highlight');

        if (disabled) newClassNames.push('disabled');

        if (itemImage === null) newClassNames.push('icon', 'loading-icon');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [itemActive, itemUniqueSoldout, itemUniqueNumber, itemUnseen, itemHighlight, disabled, itemImage, classNames]);

    const getStyle = useMemo(() => {
        let newStyle = { ...style };

        if (itemImage && !(itemUniqueSoldout || itemUniqueNumber > 0)) newStyle.backgroundImage = `url(${itemImage})`;

        if (itemColor) newStyle.backgroundColor = itemColor;

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [style, itemImage, itemColor, itemUniqueSoldout, itemUniqueNumber]);

    return (
        <Column
            pointer
            aria-pressed={isButton && !hasOwnSemantics ? itemActive : undefined}
            center={center}
            classNames={getClassNames}
            column={column}
            component={itemComponent}
            disabled={isButton && disabled ? true : undefined}
            overflow={overflow}
            position={position}
            style={getStyle}
            {...rest}
        >
            {itemCount > itemCountMinimum && <LayoutItemCountView count={itemCount} />}
            {itemUniqueNumber > 0 && (
                <>
                    <Base fit className="unique-bg-override" style={{ backgroundImage: `url(${itemImage})` }} />
                    <div className="absolute bottom-0 unique-item-counter">
                        <LayoutLimitedEditionStyledNumberView value={itemUniqueNumber} />
                    </div>
                </>
            )}
            {children}
        </Column>
    );
};
