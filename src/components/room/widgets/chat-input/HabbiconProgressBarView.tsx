import { FC, useEffect, useRef, useState } from 'react';

type HabbiconProgressBarProps = {
    completed: number;
    total: number;
    variant: 'album' | 'set' | 'rail';
};

const widths = { album: 304, set: 154, rail: 69 };

export const HabbiconProgressBarView: FC<HabbiconProgressBarProps> = ({ completed, total, variant }) => {
    const target = Math.max(0, Math.min(1, total > 0 ? completed / total : 0));
    const [ratio, setRatio] = useState(target);
    const motion = useRef({ value: target, speed: 0 });

    useEffect(() => {
        const state = motion.current;
        let previousTime = performance.now();
        let frame = 0;

        state.speed = Math.sign(target - state.value) * Math.min(Math.abs(state.speed), 0.003);

        // WIN63 AnimatedScalar: acceleration .00001/ms², max speed .003/ms,
        // tolerance .0001, integrated in steps no longer than 8ms.
        const update = (time: number) => {
            let remaining = time - previousTime;
            previousTime = time;

            while (remaining > 0) {
                const distance = target - state.value;
                const direction = Math.sign(distance);

                if (Math.abs(distance) <= 0.0001) {
                    state.value = target;
                    state.speed = 0;
                    break;
                }

                const step = Math.min(remaining, 8);
                const directedSpeed = state.speed * direction;
                const stoppingDistance = (directedSpeed * directedSpeed) / 0.00002;
                const acceleration =
                    directedSpeed < 0
                        ? direction * 0.00001
                        : stoppingDistance >= Math.abs(distance)
                          ? -direction * 0.00001
                          : directedSpeed >= 0.003
                            ? 0
                            : direction * 0.00001;
                const nextValue = state.value + state.speed * step + 0.5 * acceleration * step * step;
                let nextSpeed = Math.max(-0.003, Math.min(0.003, state.speed + acceleration * step));

                if (Math.sign(target - nextValue) !== direction || Math.abs(target - nextValue) <= 0.0001) {
                    state.value = target;
                    state.speed = 0;
                    break;
                }

                if (state.speed !== 0 && Math.sign(nextSpeed) !== Math.sign(state.speed) && Math.sign(acceleration) !== direction) nextSpeed = 0;

                state.value = nextValue;
                state.speed = nextSpeed;
                remaining -= step;
            }

            setRatio(state.value);

            if (state.value !== target) frame = requestAnimationFrame(update);
        };

        frame = requestAnimationFrame(update);

        return () => cancelAnimationFrame(frame);
    }, [target]);

    const width = widths[variant];
    const clipWidth = Math.round(width * ratio);
    const fillWidth = clipWidth >= width - 4 ? width : clipWidth + 4;

    return (
        <div className={`habbicon-progress-bar habbicon-progress-bar-${variant}`} data-complete={ratio >= 1}>
            <div className="habbicon-progress-clip" style={{ width: clipWidth }}>
                <div className="habbicon-progress-fill" style={{ width: fillWidth }} />
            </div>
        </div>
    );
};
