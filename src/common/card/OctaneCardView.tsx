import { FC, useMemo, useRef } from 'react';
import { Column, ColumnProps } from '..';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../draggable-window';
import { OctaneCardContextProvider } from './OctaneCardContext';

export interface OctaneCardViewProps extends DraggableWindowProps, ColumnProps {
    theme?: string;
    isResizable?: boolean;
    frameStyle?: number;
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
        frameStyle = null,
        dragStyle,
        offsetLeft,
        offsetTop,
        ...rest
    } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [isResizable ? 'resize' : 'resize-none', 'octane-card', 'octane-card-shell', `theme-${theme}`];

        if (frameStyle !== null) newClassNames.push(`octane-card-frame-${frameStyle}`);
        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames, frameStyle, isResizable]);

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
