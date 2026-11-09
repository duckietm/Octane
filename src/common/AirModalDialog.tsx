import { FC, MouseEvent, PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { OctaneCardContentView, OctaneCardHeaderView } from './card';

interface AirModalDialogProps {
    /** Small caps line above the frame (`il_frame_modal_title`, 11 px grey in AIR). */
    subtitle?: string;
    /** Large white title above the frame. */
    title?: string;
    /** Caption of the frame's own title bar. */
    caption?: string;
    width: number;
    className?: string;
    noCloseButton?: boolean;
    onClose: () => void;
    /** A click on the dimmed desktop; the talent track closes on it, the other dialogs do not. */
    onBackdropClick?: () => void;
}

/**
 * The official window manager's buildModalDialogFromXML: the desktop is dimmed, the frame sits in
 * the middle and modal layouts carry their big white title above the frame.
 */
export const AirModalDialog: FC<PropsWithChildren<AirModalDialogProps>> = (props) => {
    const { subtitle = null, title = null, caption = '', width, className = '', noCloseButton = false, onClose, onBackdropClick = null, children } = props;

    const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;

        onBackdropClick?.();
    };

    return createPortal(
        <div className="octane-air-modal" onClick={onBackdrop}>
            <div className={`octane-air-modal__window ${className}`} style={{ width: `min(${width}px, calc(100vw - 16px))` }}>
                {(subtitle || title) && (
                    <div className="octane-air-modal__titles">
                        {subtitle && <div className="octane-air-modal__subtitle">{subtitle}</div>}
                        {title && <div className="octane-air-modal__title">{title}</div>}
                    </div>
                )}
                <div className={`octane-card octane-card-shell theme-primary-slim octane-air-modal__frame ${noCloseButton ? 'is-no-close' : ''}`}>
                    <OctaneCardHeaderView headerText={caption} noCloseButton={noCloseButton} onCloseClick={() => onClose()} />
                    <OctaneCardContentView className="octane-air-modal__content text-black">{children}</OctaneCardContentView>
                </div>
            </div>
        </div>,
        document.body
    );
};
