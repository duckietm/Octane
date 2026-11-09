import { FC, useRef } from 'react';
import { useDraggableLoginWindow } from '../hooks/useDraggableLoginWindow';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { resolveNewsLink } from '../utils/news';

interface LoginWidgetSlotProps {
    slotKey: string;
    type: string;
    image: string;
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    dragHint: string;
}

export const LoginWidgetSlot: FC<LoginWidgetSlotProps> = ({ slotKey, type, image, title, description, buttonText, buttonLink, dragHint }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const { style, dragging, handleProps } = useDraggableLoginWindow(`widget.${slotKey}`, rootRef);

    return (
        <NativeTextTree>
            <div
                className={`login-widget-slot login-drag-handle${dragging ? ' is-dragging' : ''}`}
                data-widget-type={type}
                ref={rootRef}
                style={style}
                title={dragHint}
                {...handleProps}
            >
                {image && <img className="login-widget-image" src={image} alt="" draggable={false} />}
                <div className="login-widget-content">
                    <div className="login-widget-title">{title}</div>
                    {description && <div className="login-widget-description">{description}</div>}
                    {buttonText && (
                        <BaseButton
                            type="button"
                            className="login-widget-button"
                            onClick={() => {
                                // The link comes from the CMS: only a web URL or a path on this site is followed.
                                const target = resolveNewsLink(buttonLink);
                                if (target) window.location.href = target;
                            }}
                        >
                            {buttonText}
                        </BaseButton>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
