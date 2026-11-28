import { CSSProperties, FC, MouseEvent, PropsWithChildren, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NativeTextTransformScale } from './native-text/NativeTextTransformScale';
import { useHandheldFrameFit } from '../hooks/handheld/useHandheldFrameFit';
import { useHandheldStore } from '../state/handheldStore';
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
    /** Window chrome: the default slim title bar, or 3 for the AIR frame the reward track uses (`octane-card-frame-3`). */
    frameStyle?: 3 | null;
    /** Phone layout: the frame has a fixed pixel layout; it is drawn smaller to fit the screen, down to this scale. */
    handheldScale?: number;
    /** Phone layout, with `handheldScale`: a small frame may also be drawn bigger, up to this scale. */
    handheldMaxScale?: number;
}

/**
 * The official window manager's buildModalDialogFromXML: the desktop is dimmed, the frame sits in
 * the middle and modal layouts carry their big white title above the frame.
 */
export const AirModalDialog: FC<PropsWithChildren<AirModalDialogProps>> = (props) => {
    const { subtitle = null, title = null, caption = '', width, className = '', noCloseButton = false, onClose, onBackdropClick = null, frameStyle = null, handheldScale, handheldMaxScale = 1, children } = props;
    const windowRef = useRef<HTMLDivElement>(null);
    const handheldFit = useHandheldFrameFit(windowRef, handheldScale, handheldMaxScale);
    const handheldPan = !!handheldFit && (handheldFit.panX || handheldFit.panY);
    // A scaled frame keeps its own width on a phone; it is measured at that width and then drawn smaller.
    const keepsWidth = useHandheldStore((state) => state.layout.active) && !!handheldScale;
    const windowStyle: CSSProperties = keepsWidth
        ? ({ width: `${width}px`, ...(handheldFit ? { '--octane-handheld-scale': String(handheldFit.scale) } : null) } as CSSProperties)
        : { width: `min(${width}px, calc(100vw - 16px))` };

    const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;

        onBackdropClick?.();
    };

    return createPortal(
        <div className="octane-air-modal" data-handheld-pan={handheldPan ? '' : undefined} onClick={onBackdrop}>
            <div
                ref={windowRef}
                className={`octane-air-modal__window ${className}`}
                data-handheld-scaled={handheldFit ? '' : undefined}
                data-handheld-fixed={keepsWidth ? '' : undefined}
                style={windowStyle}
            >
                <NativeTextTransformScale scale={handheldFit?.scale ?? 1} stage={windowRef}>
                    {(subtitle || title) && (
                        <div className="octane-air-modal__titles">
                            {subtitle && <div className="octane-air-modal__subtitle">{subtitle}</div>}
                            {title && <div className="octane-air-modal__title">{title}</div>}
                        </div>
                    )}
                    <div
                        className={`octane-card octane-card-shell ${frameStyle === 3 ? 'octane-card-frame-3' : 'theme-primary-slim'} octane-air-modal__frame ${noCloseButton ? 'is-no-close' : ''}`}
                    >
                        <OctaneCardHeaderView headerText={caption} noCloseButton={noCloseButton} onCloseClick={() => onClose()} />
                        <OctaneCardContentView className="octane-air-modal__content text-black">{children}</OctaneCardContentView>
                    </div>
                </NativeTextTransformScale>
            </div>
        </div>,
        document.body
    );
};
