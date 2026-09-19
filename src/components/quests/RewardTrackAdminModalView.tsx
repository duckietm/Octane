import { FC, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** A window of its own for the editor's forms, over the Reward Track window, closed by the X or a click outside. */
export const RewardTrackAdminModalView: FC<{ title: ReactNode; width?: number; onClose: () => void; children?: ReactNode }> = ({ title, width = 560, onClose, children = null }) => {
    const onCloseMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    return createPortal(
        <div className="octane-reward-track-admin-overlay" onClick={onClose} data-testid="rt-admin-modal">
            <div className="octane-reward-track-admin-modal" style={{ width }} onClick={(event) => event.stopPropagation()}>
                <div className="octane-reward-track-admin-modal-head">
                    <span className="octane-reward-track-admin-modal-title">{title}</span>
                    <div className="octane-card-close-button" onClick={onClose} onMouseDownCapture={onCloseMouseDown} />
                </div>
                <div className="octane-reward-track-admin-modal-body octane-reward-track-admin">{children}</div>
            </div>
        </div>,
        document.body
    );
};
