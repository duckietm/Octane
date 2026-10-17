import { FC, useRef } from 'react';
import { useDraggableLoginWindow } from '../hooks/useDraggableLoginWindow';
import { BaseButton } from '../../../common/BaseButton';

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
                            if (buttonLink) window.location.href = buttonLink;
                        }}
                    >
                        {buttonText}
                    </BaseButton>
                )}
            </div>
        </div>
    );
};
