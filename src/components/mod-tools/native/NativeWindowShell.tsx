import { FC, ReactNode, useCallback } from 'react';
import { DraggableWindow } from '../../../common/draggable-window';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ModWindowType, useModWindowTrackerStore } from '../../../hooks';

interface NativeWindowShellProps {
    type: ModWindowType;
    windowKey: string;
    x: number;
    y: number;
    children?: ReactNode;
}

/**
 * A moderator window frame placed at the tracker position: dragged by its header and raised to the front when clicked; the position it is dropped at goes back to
 * the tracker, so the windows opened from it are placed next to where it is now.
 */
export const NativeWindowShell: FC<NativeWindowShellProps> = ({ type, windowKey, x, y, children }) => {
    const move = useModWindowTrackerStore((state) => state.move);
    const onPositionChange = useCallback((position: { x: number; y: number }) => move(type, windowKey, position.x, position.y), [move, type, windowKey]);

    return (
        <NativeTextTree>
            <DraggableWindow handleSelector=".native0-header" initialPosition={{ x, y }} onPositionChange={onPositionChange}>
                {children}
            </DraggableWindow>
        </NativeTextTree>
    );
};
