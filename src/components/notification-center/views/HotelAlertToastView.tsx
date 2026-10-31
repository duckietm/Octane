import { FC, useEffect, useState } from 'react';
import frankImage from '@/assets/images/notifications/frank.gif';
import { LocalizeText, PlaySound, SoundNames } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useHotelAlertToastStore } from '../../../hooks/notification/hotelAlertToastStore';

const ENTER_MS = 350;
const CLOSE_MS = 450;
const HOLD_BASE_MS = 6000;
const HOLD_PER_CHAR_MS = 45;
const HOLD_MAX_MS = 15000;

type ToastPhase = 'enter' | 'open' | 'closing';

export const HotelAlertToastView: FC<{}> = () => {
    const toast = useHotelAlertToastStore((state) => (state.toasts.length ? state.toasts[0] : null));
    const dismissToast = useHotelAlertToastStore((state) => state.dismissToast);
    const [phase, setPhase] = useState<ToastPhase>('enter');

    const toastId = toast ? toast.id : -1;
    const messageLength = toast ? toast.message.length : 0;

    useEffect(() => {
        if (toastId === -1) return;

        setPhase('enter');
        PlaySound(SoundNames.DUCKETS);

        const holdMs = Math.min(HOLD_MAX_MS, HOLD_BASE_MS + (messageLength * HOLD_PER_CHAR_MS));
        const openTimer = window.setTimeout(() => setPhase('open'), ENTER_MS);
        const closeTimer = window.setTimeout(() => setPhase('closing'), ENTER_MS + holdMs);
        const removeTimer = window.setTimeout(() => dismissToast(toastId), ENTER_MS + holdMs + CLOSE_MS);

        return () => {
            window.clearTimeout(openTimer);
            window.clearTimeout(closeTimer);
            window.clearTimeout(removeTimer);
        };
    }, [toastId, messageLength, dismissToast]);

    if (!toast) return null;

    const dismissEarly = () => {
        if (phase === 'closing') return;

        setPhase('closing');
        window.setTimeout(() => dismissToast(toast.id), CLOSE_MS);
    };

    return (
        <NativeTextTree>
            <div className={`hotel-alert-toast phase-${phase}${toast.variant === 'staff' ? ' is-staff' : ''}`} role="status" onClick={dismissEarly}>
                <div className="hotel-alert-toast-circle">
                    <img alt="" draggable={false} src={frankImage} />
                </div>
                <div className="hotel-alert-toast-pill">
                    <div className="hotel-alert-toast-body">
                        <span className="hotel-alert-toast-title">{toast.title || LocalizeText('notifications.broadcast.title')}</span>
                        <span className="hotel-alert-toast-message">{toast.message}</span>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
