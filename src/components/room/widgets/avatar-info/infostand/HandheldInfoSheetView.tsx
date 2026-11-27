import { FC, PointerEvent, ReactNode, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { localizeWithFallback } from '../../../../../api';
import { sheetPullDistance, shouldDismissSheet } from '../../../../../api/handheld/handheldSheet';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface HandheldInfoSheetViewProps {
    onClose: () => void;
    /** Shows the Actions button; it opens the menu of the selected avatar. */
    onActions?: () => void;
    actionsOpen?: boolean;
    children?: ReactNode;
}

/**
 * Phone layout infostand: the regular infostand content in a sheet along the bottom edge (portrait) or the
 * right edge (landscape), with a grip to pull it away, a finger-sized close button and, for avatars, a
 * button for the action menu that the desktop opens with a click on the avatar.
 */
export const HandheldInfoSheetView: FC<HandheldInfoSheetViewProps> = ({ onClose, onActions, actionsOpen = false, children }) => {
    const [pulled, setPulled] = useState(0);
    const sheetRef = useRef<HTMLElement>(null);
    const pullRef = useRef<{ pointerId: number; startY: number } | null>(null);

    const onGripDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary) return;

        pullRef.current = { pointerId: event.pointerId, startY: event.clientY };

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
    };

    const onGripMove = (event: PointerEvent<HTMLDivElement>) => {
        const pull = pullRef.current;

        if (!pull || pull.pointerId !== event.pointerId) return;

        setPulled(sheetPullDistance(pull.startY, event.clientY));
    };

    const onGripUp = (event: PointerEvent<HTMLDivElement>) => {
        const pull = pullRef.current;

        if (!pull || pull.pointerId !== event.pointerId) return;

        pullRef.current = null;

        const distance = sheetPullDistance(pull.startY, event.clientY);

        setPulled(0);

        if (shouldDismissSheet(distance, sheetRef.current?.offsetHeight ?? 0)) onClose();
    };

    const closeLabel = localizeWithFallback('octane.handheld.info.close', 'Close');

    return (
        <NativeTextTree>
            <section
                ref={sheetRef}
                aria-label={localizeWithFallback('octane.handheld.info.title', 'Info')}
                className="octane-handheld-info-sheet"
                data-pulling={pulled > 0 ? '' : undefined}
                style={pulled > 0 ? { transform: `translateY(${pulled}px)` } : undefined}
            >
                <div className="octane-handheld-info-sheet__grip" onPointerCancel={onGripUp} onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp}>
                    <span aria-hidden="true" className="octane-handheld-info-sheet__grip-bar" />
                </div>
                <div className="octane-handheld-info-sheet__bar">
                    {onActions && (
                        <BaseButton aria-expanded={actionsOpen} className="octane-handheld-info-sheet__actions" onClick={onActions}>
                            {localizeWithFallback('octane.handheld.info.actions', 'Actions')}
                        </BaseButton>
                    )}
                    <BaseButton aria-label={closeLabel} className="octane-handheld-info-sheet__close" onClick={onClose}>
                        <FaTimes aria-hidden="true" />
                    </BaseButton>
                </div>
                <div className="octane-handheld-info-sheet__body">{children}</div>
            </section>
        </NativeTextTree>
    );
};
