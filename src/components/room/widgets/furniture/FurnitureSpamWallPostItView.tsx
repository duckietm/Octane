import { CSSProperties, FC } from 'react';
import { ColorUtils } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFurnitureSpamWallPostItWidget } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';

// Must match PostItColor on the gameserver — YELLOW is the server-side default.
const STICKIE_COLORS = ['FF9C9C', 'FFC69C', 'FFFF33', '9CFF9C', '9CFFE8', '9CCEFF', 'C69CFF', 'FF9CFF'];
const DEFAULT_STICKIE_COLOR = 'FFFF33';

const getStickieColor = (color: string) => {
    if (STICKIE_COLORS.indexOf(color) === -1) color = DEFAULT_STICKIE_COLOR;

    return ColorUtils.makeColorHex(color);
};

export const FurnitureSpamWallPostItView: FC<{}> = (props) => {
    const { objectId = -1, color = '0', setColor = null, text = '', setText = null, canModify = false, onClose = null } = useFurnitureSpamWallPostItWidget();

    if (objectId === -1) return null;

    return (
        <DraggableWindow handleSelector=".drag-handler" windowPosition={DraggableWindowPosition.TOP_LEFT}>
            <div className="octane-stickie stickie-plain" style={{ '--stickie-color': getStickieColor(color) } as CSSProperties}>
                <div className="flex items-center stickie-header drag-handler">
                    <div className="flex items-center grow! h-full">
                        {canModify && (
                            <>
                                <BaseButton type="button" className="octane-stickie-image stickie-trash header-trash" onClick={onClose}></BaseButton>
                                {STICKIE_COLORS.map((stickieColor) => {
                                    return (
                                        <BaseButton type="button"
                                            key={stickieColor}
                                            className="stickie-color ms-1"
                                            style={{ backgroundColor: ColorUtils.makeColorHex(stickieColor) }}
                                            onClick={(event) => setColor(stickieColor)}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </div>
                    <BaseButton type="button" className="flex items-center octane-stickie-image stickie-close header-close" onClick={onClose}></BaseButton>
                </div>
                <div className="stickie-context">
                    <textarea autoFocus className="context-text" tabIndex={0} value={text} onChange={(event) => setText(event.target.value)}></textarea>
                </div>
            </div>
        </DraggableWindow>
    );
};
