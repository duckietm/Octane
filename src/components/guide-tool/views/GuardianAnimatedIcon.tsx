import { FC, useEffect, useState } from 'react';

interface GuardianAnimatedIconProps {
    frames: string[];
    className?: string;
}

/** AIR startWaitingAnimation: the frames of a waiting icon, one every 500 ms. */
export const GuardianAnimatedIcon: FC<GuardianAnimatedIconProps> = ({ frames, className = '' }) => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        if (frames.length < 2) return;

        const interval = window.setInterval(() => setFrame((value) => (value + 1) % frames.length), 500);

        return () => window.clearInterval(interval);
    }, [frames.length]);

    return <img alt="" className={className} draggable={false} src={frames[frame % frames.length]} />;
};
