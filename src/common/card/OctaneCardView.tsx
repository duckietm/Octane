import { FC, useMemo, useRef } from 'react';
import { Column, ColumnProps } from '..';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../draggable-window';
import { CardResizeHandle } from './CardResizeHandle';
import { OctaneCardContextProvider } from './OctaneCardContext';

export interface OctaneCardViewProps extends DraggableWindowProps, ColumnProps {
    theme?: string;
    isResizable?: boolean;
    /** Window chrome. Defaults to the plain title bar; pass 3 for the official frame. */
    frameStyle?: number | null;
    /** Official 17px scrollbar skin (default). Pass false for the slim native scrollbar. */
    classicScrollbar?: boolean;
    resizeAxis?: 'both' | 'vertical' | 'horizontal';
}

export const OctaneCardView: FC<OctaneCardViewProps> = (props) => {
    const {
        theme = 'primary',
        uniqueKey = null,
        handleSelector = '.drag-handler',
        windowPosition = DraggableWindowPosition.CENTER,
        disableDrag = false,
        overflow,
        position = 'relative',
        gap = 0,
        classNames = [],
        isResizable = true,
        frameStyle = null,
        classicScrollbar = true,
        resizeAxis = 'both',
        children,
        dragStyle,
        offsetLeft,
        offsetTop,
        ...rest
    } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    const isWired =
        classNames.some((name) => name === 'octane-wired' || name.startsWith('octane-wired ')) ||
        (typeof rest.className === 'string' && rest.className.split(/\s+/).includes('octane-wired'));
    const resolvedFrameStyle = isWired ? null : frameStyle;
    const resolvedOverflow = overflow ?? (resolvedFrameStyle === 3 ? 'visible' : 'hidden');

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [isResizable ? 'resize' : 'resize-none', 'octane-card', 'octane-card-shell', `theme-${theme}`];

        // Frame 0 is the plain title bar, so it needs no class at all.
        if (resolvedFrameStyle) newClassNames.push(`octane-card-frame-${resolvedFrameStyle}`);
        newClassNames.push(classicScrollbar ? 'has-classic-scrollbar' : 'octane-scrollbar-native');
        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames, classicScrollbar, isResizable, resolvedFrameStyle, theme]);

    return (
        <OctaneCardContextProvider value={{ theme }}>
            <DraggableWindow
                disableDrag={disableDrag}
                dragStyle={resolvedFrameStyle === 3 ? { filter: 'drop-shadow(2.828px 2.828px 4px rgba(0, 0, 0, 0.349))', ...dragStyle } : dragStyle}
                handleSelector={handleSelector}
                offsetLeft={offsetLeft}
                offsetTop={offsetTop}
                uniqueKey={uniqueKey}
                windowPosition={windowPosition}
            >
                <Column classNames={getClassNames} gap={gap} innerRef={elementRef} overflow={resolvedOverflow} position={position} {...rest}>
                    {children}
                    {isResizable && resolvedFrameStyle === 3 && <CardResizeHandle uniqueKey={uniqueKey} elementRef={elementRef} resizeAxis={resizeAxis} />}
                </Column>
            </DraggableWindow>
        </OctaneCardContextProvider>
    );
};
