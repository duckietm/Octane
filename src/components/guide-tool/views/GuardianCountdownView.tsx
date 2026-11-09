import { FC, useEffect, useState } from 'react';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface GuardianCountdownViewProps {
    seconds: number;
    /** A new id restarts the countdown from `seconds`. */
    countdownId: number;
}

/** The two-digit countdown widget of the chat review windows (mm:ss, stops at zero). */
export const GuardianCountdownView: FC<GuardianCountdownViewProps> = ({ seconds, countdownId }) => {
    const [left, setLeft] = useState(seconds);

    useEffect(() => {
        setLeft(seconds);

        if (seconds <= 0) return;

        const startedAt = Date.now();
        const interval = window.setInterval(() => {
            const remaining = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));

            setLeft(remaining);

            if (remaining <= 0) window.clearInterval(interval);
        }, 250);

        return () => window.clearInterval(interval);
    }, [seconds, countdownId]);

    if (seconds < 0) return null;

    const minutes = Math.floor(left / 60);
    const rest = left % 60;

    return (
        <NativeTextTree>
            <div className="octane-guardian-countdown" role="timer">
                {`${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`}
            </div>
        </NativeTextTree>
    );
};
