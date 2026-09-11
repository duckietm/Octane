import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { Button } from '../../common';
import { getReconnectPresentation, useConnectionState } from '../../hooks';

/* habbo_window_alert.xml: a 278x141 frame-3 window whose text starts 27px in
   and whose buttons sit on a row 10px under it. */
const ALERT_WIDTH = 278;
const ALERT_MIN_HEIGHT = 141;

export const ReconnectView: FC<{}> = () => {
    const connectionState = useConnectionState();
    const { isReconnecting, hasFailed, attempt, maxAttempts } = getReconnectPresentation(connectionState);

    if (!isReconnecting && !hasFailed) return null;

    const title = isReconnecting
        ? localizeWithFallback('disconnected.reconnecting.title', 'Connection lost')
        : localizeWithFallback('disconnected.expired.title', 'Session expired');

    const attemptText = localizeWithFallback(
        'disconnected.reconnecting.attempt',
        `Reconnecting to the hotel... (attempt ${attempt}/${maxAttempts})`,
        ['attempt', 'max'],
        [attempt.toString(), maxAttempts.toString()]
    );

    const progress = maxAttempts > 0 ? Math.min(100, (attempt / maxAttempts) * 100) : 0;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="octane-reconnect-title"
        >
            {/* Not a OctaneCardView: the alert must not be draggable or closable, and it lives outside the window stack. */}
            <div
                className="octane-card octane-card-shell octane-card-frame-3 relative flex flex-col"
                style={{ width: ALERT_WIDTH, minHeight: ALERT_MIN_HEIGHT, resize: 'none' }}
                data-testid="reconnect-alert"
            >
                <div className="octane-card-header-shell relative flex items-center justify-center">
                    <span id="octane-reconnect-title" className="octane-card-title text-white">
                        {title}
                    </span>
                </div>
                <div className="octane-card-content-shell flex flex-col grow gap-[10px] !pt-[14px] !px-[27px] !pb-[10px]">
                    {isReconnecting && (
                        <>
                            <p className="m-0">{attemptText}</p>
                            <div className="w-full h-[6px] overflow-hidden border border-[#8d8d8d] bg-white" aria-hidden="true">
                                <div className="h-full bg-[#418db0] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="m-0 opacity-70">
                                {localizeWithFallback('disconnected.reconnecting.wait', 'Please wait, your session will be restored automatically.')}
                            </p>
                        </>
                    )}

                    {hasFailed && (
                        <>
                            <p className="m-0">{localizeWithFallback('disconnected.generic', 'You have been disconnected. Please try again.')}</p>
                            <p className="m-0 opacity-70">
                                {localizeWithFallback('disconnected.expired.body', 'Your session has expired. Please log in again to enter the hotel.')}
                            </p>
                            <div className="flex justify-center mt-auto">
                                <Button variant="primary" onClick={() => window.location.assign(`${window.location.origin}/`)}>
                                    {localizeWithFallback('disconnected.expired.button', 'Back to Hotel')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
