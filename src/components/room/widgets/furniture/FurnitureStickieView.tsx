import { CSSProperties, FC, useEffect, useState } from 'react';
import { ColorUtils } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFurnitureStickieWidget } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';

// Must match PostItColor on the gameserver — YELLOW is the server-side default.
const STICKIE_COLORS = ['FF9C9C', 'FFC69C', 'FFFF33', '9CFF9C', '9CFFE8', '9CCEFF', 'C69CFF', 'FF9CFF'];
const DEFAULT_STICKIE_COLOR = 'FFFF33';

const STICKIE_TYPES = ['post_it_shakesp', 'post_it_dreams', 'post_it_xmas', 'post_it_vd', 'post.it.vd', 'post_it_juninas'];
const STICKIE_TYPE_NAMES = ['shakesp', 'dreams', 'christmas', 'heart', 'heart', 'juninas'];

const isThemedStickie = (type: string) => STICKIE_TYPES.indexOf(type) > -1;

const getStickieColor = (color: string) => {
    if (STICKIE_COLORS.indexOf(color) === -1) color = DEFAULT_STICKIE_COLOR;

    return ColorUtils.makeColorHex(color);
};

const getStickieTypeName = (type: string) => STICKIE_TYPE_NAMES[STICKIE_TYPES.indexOf(type)];

export const FurnitureStickieView: FC<{}> = (props) => {
    const {
        objectId = -1,
        color = '0',
        text = '',
        type = '',
        canModify = false,
        updateColor = null,
        updateText = null,
        trash = null,
        onClose = null
    } = useFurnitureStickieWidget();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setIsEditing(false);
    }, [objectId, color, text, type]);

    if (objectId === -1) return null;

    const isThemed = isThemedStickie(type);

    return (
        <DraggableWindow handleSelector=".drag-handler" windowPosition={DraggableWindowPosition.TOP_LEFT}>
            <div
                className={'octane-stickie ' + (isThemed ? 'octane-stickie-image stickie-' + getStickieTypeName(type) : 'stickie-plain')}
                style={isThemed ? undefined : ({ '--stickie-color': getStickieColor(color) } as CSSProperties)}>
                <div className="flex items-center stickie-header drag-handler">
                    <div className="flex items-center grow! h-full">
                        {canModify && (
                            <>
                                <BaseButton type="button" className="octane-stickie-image stickie-trash header-trash" onClick={trash}></BaseButton>
                                {!isThemed && (
                                    <>
                                        {STICKIE_COLORS.map((stickieColor) => {
                                            return (
                                                <BaseButton type="button"
                                                    key={stickieColor}
                                                    className="stickie-color ms-1"
                                                    style={{ backgroundColor: ColorUtils.makeColorHex(stickieColor) }}
                                                    onClick={(event) => updateColor(stickieColor)}
                                                />
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <BaseButton type="button" className="flex items-center octane-stickie-image stickie-close header-close" onClick={onClose}></BaseButton>
                </div>
                <div className="stickie-context">
                    {!isEditing || !canModify ? (
                        <div className="context-text" onClick={(event) => canModify && setIsEditing(true)}>
                            {text}
                        </div>
                    ) : (
                        <textarea
                            autoFocus
                            className="context-text"
                            defaultValue={text}
                            tabIndex={0}
                            onBlur={(event) => updateText(event.target.value)}
                        ></textarea>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};
