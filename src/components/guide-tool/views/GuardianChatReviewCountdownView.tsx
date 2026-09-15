import { FC, useEffect, useState } from 'react';

/**
 * The `countdown` widget (countdown:digits=2) the official accept and vote
 * windows run: it counts the acceptance / voting timeout down to zero.
 */
export const GuardianChatReviewCountdownView: FC<{ seconds: number; running?: boolean }> = (props) => {
    const { seconds = 0, running = true } = props;
    const [remaining, setRemaining] = useState<number>(Math.max(0, seconds));

    useEffect(() => {
        setRemaining(Math.max(0, seconds));

        if (!running) return;

        const interval = window.setInterval(() => setRemaining((value) => (value > 0 ? value - 1 : 0)), 1000);

        return () => window.clearInterval(interval);
    }, [seconds, running]);

    return (
        <div className="octane-guardian-countdown" title="countdown">
            {remaining.toString().padStart(2, '0')}
        </div>
    );
};
