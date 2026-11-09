import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RewardTrackProgressBarStepper, RewardTrackTaskProgressBarStepper } from '../../api/quests/RewardTrackProgressAnimation';

export interface RewardTrackProgressBarOptions {
    /** The bar's target ratio (0..1, clamped). */
    ratio: number;
    /** The bar container's width in px (the main bar 602, task rows 200, levels 260). */
    maxWidth: number;
    /** RewardTrackView.shouldAnimate: changes animate while the window shows; false snaps them. */
    animate: boolean;
    /** A change of this key snaps the bar instead of animating it (a new page, task, track or track list). */
    snapKey: string;
    /** The task bars (RewardTrackTaskProgressBarView): orange / green fill colour and the level-up step. */
    task?: boolean;
    /** Task rows: the active level; a change of it while animating fills the bar first, then restarts. */
    levelIndex?: number;
}

export interface RewardTrackProgressBarFrame {
    width: number;
    /** The task bar's fill colour (0xRRGGBB), null for the main bar. */
    color: number;
}

const frameOf = (stepper: RewardTrackProgressBarStepper): RewardTrackProgressBarFrame => ({ width: stepper.width, color: stepper.color });

/**
 * Drives a reward track progress bar like AIR's RewardTrackProgressBarViewBase: the first value is shown
 * at once (the views are built with `setRatio(r, false)`), later values animate with the accelerated mover
 * on requestAnimationFrame frames, and a change of `snapKey` (or `animate` false) jumps.
 */
export const useRewardTrackProgressBar = ({ ratio, maxWidth, animate, snapKey, task = false, levelIndex = -1 }: RewardTrackProgressBarOptions): RewardTrackProgressBarFrame => {
    const [stepper] = useState<RewardTrackProgressBarStepper>(() => {
        const created = task ? new RewardTrackTaskProgressBarStepper(maxWidth) : new RewardTrackProgressBarStepper(maxWidth);

        created.setRatio(ratio, false);

        return created;
    });
    const [frame, setFrame] = useState<RewardTrackProgressBarFrame>(() => frameOf(stepper));
    const applied = useRef({ ratio, snapKey, levelIndex });
    const frameRequest = useRef(0);

    useLayoutEffect(() => {
        const last = applied.current;

        if (last.ratio === ratio && last.snapKey === snapKey && last.levelIndex === levelIndex) return;

        applied.current = { ratio, snapKey, levelIndex };

        const shouldAnimate = animate && last.snapKey === snapKey;

        if (stepper instanceof RewardTrackTaskProgressBarStepper) stepper.setTaskRatio(ratio, shouldAnimate, last.levelIndex !== -1 && last.levelIndex !== levelIndex);
        else stepper.setRatio(ratio, shouldAnimate);

        setFrame(frameOf(stepper));

        if (!stepper.isAnimating || frameRequest.current || typeof requestAnimationFrame !== 'function') return;

        let lastTime = typeof performance !== 'undefined' ? performance.now() : 0;

        const tick = (now: number) => {
            const delta = Math.max(0, now - lastTime);

            lastTime = now;

            if (stepper.update(delta)) setFrame(frameOf(stepper));

            frameRequest.current = stepper.isAnimating ? requestAnimationFrame(tick) : 0;
        };

        frameRequest.current = requestAnimationFrame(tick);
    }, [ratio, snapKey, levelIndex, animate, stepper]);

    useEffect(
        () => () => {
            if (frameRequest.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameRequest.current);

            frameRequest.current = 0;
        },
        []
    );

    return frame;
};
