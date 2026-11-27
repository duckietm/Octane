import { FC } from 'react';
import { createPortal } from 'react-dom';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { HandheldPeekOptions, HandheldPeekState } from '../../api/handheld/handheldPeek';
import { BaseButton } from '../BaseButton';

interface HandheldPeekControlsProps {
    options: HandheldPeekOptions;
    state: HandheldPeekState;
    onHide: () => void;
    onShow: () => void;
}

/**
 * Phone layout: the button that puts a room-working window aside (drawn in its top-left corner, at the screen's own size whatever
 * the window is scaled to) and, while it is aside, the bar at the top of the screen that names it and brings it back.
 */
export const HandheldPeekControls: FC<HandheldPeekControlsProps> = ({ options, state, onHide, onShow }) => {
    if (state.canHide) {
        const label = localizeWithFallback('octane.handheld.window.peek', 'Show the room');

        return (
            <BaseButton aria-label={label} className="octane-handheld-peek-button" onClick={onHide}>
                <span aria-hidden="true" className="octane-handheld-peek-button__icon" />
            </BaseButton>
        );
    }

    if (!state.hidden || typeof document === 'undefined') return null;

    const action =
        state.barAction === 'return'
            ? localizeWithFallback('octane.handheld.window.peek_done', 'Done')
            : state.barAction === 'show'
              ? localizeWithFallback('octane.handheld.window.peek_return', 'Back to window')
              : null;

    return createPortal(
        <div className="octane-handheld-peek-bar" role="status">
            <span className="octane-handheld-peek-bar__text">
                <span className="octane-handheld-peek-bar__label">{options.label}</span>
                {!!options.hint && <span className="octane-handheld-peek-bar__hint">{options.hint}</span>}
            </span>
            {action && (
                <BaseButton className="octane-handheld-peek-bar__button" onClick={state.barAction === 'return' ? options.onReturn : onShow}>
                    {action}
                </BaseButton>
            )}
        </div>,
        document.body
    );
};
