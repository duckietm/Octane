import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ComponentProps, FC, ReactNode, useCallback, useState } from 'react';

export interface InlineDialogProps extends Omit<ComponentProps<typeof BaseDialog.Popup>, 'children' | 'render'> {
    /** Called when the dialog asks to close (Escape by default). The caller unmounts it. */
    onClose?: () => void;
    /** Trap focus and block the page behind it. Panels drawn inside a window stay non-modal. */
    modal?: boolean | 'trap-focus';
    /** Escape closes the dialog. Turn it off when the content already owns Escape. */
    closeOnEscape?: boolean;
    /** Render the popup through this element (or function) to keep its tag and classes. */
    render?: ComponentProps<typeof BaseDialog.Popup>['render'];
    children?: ReactNode;
}

/**
 * Base UI dialog for panels that are mounted only while open and positioned by the
 * host window's own css. Base UI needs a portal, so it is mounted into the parent of
 * the call site (found through a hidden marker) instead of `document.body`; the host's
 * `position: absolute; inset: 0` overlay rules keep working. No backdrop, and it never
 * dismisses itself on an outside press or focus loss, so the caller's own close logic
 * stays in charge.
 */
export const InlineDialog: FC<InlineDialogProps> = (props) => {
    const { onClose, modal = false, closeOnEscape = true, children, ...popupProps } = props;

    const [host, setHost] = useState<HTMLElement | null>(null);
    const markHost = useCallback((marker: HTMLSpanElement | null) => setHost(marker?.parentElement ?? null), []);

    return (
        <>
            <span ref={markHost} hidden />
            {host && (
                <BaseDialog.Root
                    open
                    disablePointerDismissal
                    modal={modal}
                    onOpenChange={(open, details) => {
                        if (open) return;
                        if (details.reason === 'escape-key' && !closeOnEscape) return;
                        if (details.reason !== 'escape-key' && details.reason !== 'close-press') return;

                        onClose?.();
                    }}
                >
                    <BaseDialog.Portal className="octane-inline-dialog-host" container={host}>
                        <BaseDialog.Popup {...popupProps}>{children}</BaseDialog.Popup>
                    </BaseDialog.Portal>
                </BaseDialog.Root>
            )}
        </>
    );
};

export const InlineDialogTitle = BaseDialog.Title;
export const InlineDialogClose = BaseDialog.Close;
