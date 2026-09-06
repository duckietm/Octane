import { FC, useMemo, useRef } from 'react';
import { Column, ColumnProps } from '..';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../draggable-window';
import { OctaneCardContextProvider } from './OctaneCardContext';

/* habbo_skin_frame_3: the Ubuntu-era window chrome every official window uses. */
export const DEFAULT_CARD_FRAME_STYLE = 3;

export interface OctaneCardViewProps extends DraggableWindowProps, ColumnProps {
    theme?: string;
    isResizable?: boolean;
    /** Window chrome. Defaults to the official frame 3; pass 0 (or null) for the plain 31px title bar. */
    frameStyle?: number;
    /** Official 17px scrollbar skin (default). Pass false for the slim native scrollbar. */
    classicScrollbar?: boolean;
}

export const OctaneCardView: FC<OctaneCardViewProps> = (props) => {
    const {
        theme = 'primary',
        uniqueKey = null,
        handleSelector = '.drag-handler',
        windowPosition = DraggableWindowPosition.CENTER,
        disableDrag = false,
        overflow = 'hidden',
        position = 'relative',
        gap = 0,
        classNames = [],
        isResizable = true,
        frameStyle = DEFAULT_CARD_FRAME_STYLE,
        classicScrollbar = true,
        dragStyle,
        offsetLeft,
        offsetTop,
        ...rest
    } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [isResizable ? 'resize' : 'resize-none', 'octane-card', 'octane-card-shell', `theme-${theme}`];

        // Frame 0 is the plain title bar, so it needs no class at all.
        if (frameStyle) newClassNames.push(`octane-card-frame-${frameStyle}`);
        newClassNames.push(classicScrollbar ? 'has-classic-scrollbar' : 'octane-scrollbar-native');
        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames, classicScrollbar, frameStyle, isResizable]);

    return (
        <OctaneCardContextProvider value={{ theme }}>
            <DraggableWindow
                disableDrag={disableDrag}
                dragStyle={dragStyle}
                handleSelector={handleSelector}
                offsetLeft={offsetLeft}
                offsetTop={offsetTop}
                uniqueKey={uniqueKey}
                windowPosition={windowPosition}
            >
                <Column classNames={getClassNames} gap={gap} innerRef={elementRef} overflow={overflow} position={position} {...rest} />
            </DraggableWindow>
        </OctaneCardContextProvider>
    );
};
