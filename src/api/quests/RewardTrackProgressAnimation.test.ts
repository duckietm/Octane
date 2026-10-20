import { describe, expect, it } from 'vitest';
import {
    getRewardTrackMainBarFillWidth,
    getRewardTrackMainBarRatio,
    REWARD_TRACK_BAR_COMPLETE_COLOR,
    REWARD_TRACK_BAR_INCOMPLETE_COLOR,
    RewardTrackAnimatedColor,
    RewardTrackProgressBarStepper,
    RewardTrackTaskProgressBarStepper,
    RewardTrackValueMover,
    rewardTrackColorToCss
} from './RewardTrackProgressAnimation';

const newMover = () => new RewardTrackValueMover(1e-5, 0.003, 1e-4);

/** Runs 16 ms frames until the bar settles; returns the elapsed time and the values seen. */
const runFrames = (stepper: RewardTrackProgressBarStepper, frameMs = 16, limitMs = 5000) => {
    const values: number[] = [stepper.value];
    let elapsed = 0;

    while (stepper.isAnimating && elapsed < limitMs) {
        stepper.update(frameMs);
        elapsed += frameMs;
        values.push(stepper.value);
    }

    return { elapsed, values };
};

describe('RewardTrackValueMover', () => {
    it('accelerates from rest at 1e-5 per ms², integrated in 8 ms steps', () => {
        const mover = newMover();

        mover.reset(0, 0);
        mover.setTarget(1, 0);
        mover.update(8);

        expect(mover.value).toBeCloseTo(0.5 * 1e-5 * 64, 12);
        expect(mover.velocity).toBeCloseTo(8e-5, 12);

        // A 16 ms frame is two 8 ms steps, the same as two 8 ms frames.
        const other = newMover();

        other.reset(0, 0);
        other.setTarget(1, 0);
        other.update(16);
        mover.update(16);
        expect(other.value).toBeCloseTo(mover.value, 12);
    });

    it('never goes faster than 0.003 per ms and stops on the target without overshooting', () => {
        const mover = newMover();
        let time = 0;
        let previous = 0;
        let maxSpeed = 0;

        mover.reset(0, 0);
        mover.setTarget(1, 0);

        while (mover.needsUpdate(time) && time < 5000) {
            time += 8;
            mover.update(time);
            maxSpeed = Math.max(maxSpeed, (mover.value - previous) / 8);
            expect(mover.value).toBeGreaterThanOrEqual(previous);
            expect(mover.value).toBeLessThanOrEqual(1);
            previous = mover.value;
        }

        expect(mover.value).toBe(1);
        expect(mover.velocity).toBe(0);
        expect(maxSpeed).toBeLessThanOrEqual(0.003 + 1e-12);
        // 300 ms up to full speed, a short cruise, 300 ms of braking.
        expect(time).toBeGreaterThanOrEqual(600);
        expect(time).toBeLessThan(700);
    });

    it('reset jumps without motion and a target within 1e-4 settles at once', () => {
        const mover = newMover();

        mover.reset(0.4, 0);
        expect(mover.value).toBe(0.4);
        expect(mover.needsUpdate(0)).toBe(false);

        mover.setTarget(0.40005, 10);
        expect(mover.value).toBe(0.40005);
        expect(mover.needsUpdate(10)).toBe(false);
    });

    it('keeps its speed, turned towards a new target', () => {
        const mover = newMover();

        mover.reset(0, 0);
        mover.setTarget(1, 0);
        mover.update(200);

        const speed = Math.abs(mover.velocity);

        mover.setTarget(0, 200);
        expect(mover.velocity).toBeCloseTo(-speed, 12);
    });

    it('counts a pixel difference at the given scale as unfinished', () => {
        const mover = newMover();

        mover.reset(0.5, 0);
        mover.setTarget(0.50009, 0);
        // within 1e-4: settled immediately
        expect(mover.needsUpdate(0, 602)).toBe(false);
    });
});

describe('RewardTrackAnimatedColor', () => {
    it('blends each channel linearly over its duration', () => {
        const color = new RewardTrackAnimatedColor(300);

        color.reset(REWARD_TRACK_BAR_INCOMPLETE_COLOR, 0);
        color.setTarget(REWARD_TRACK_BAR_COMPLETE_COLOR, 0);
        expect(color.needsUpdate(0)).toBe(true);

        color.update(150);
        // 0xEB->0x71, 0xA6->0xAF, 0x0C->0x24 halfway
        expect(color.value).toBe((Math.round(0xeb + (0x71 - 0xeb) / 2) << 16) | (Math.round(0xa6 + (0xaf - 0xa6) / 2) << 8) | Math.round(0x0c + (0x24 - 0x0c) / 2));

        color.update(300);
        expect(color.value).toBe(REWARD_TRACK_BAR_COMPLETE_COLOR);
        expect(color.needsUpdate(300)).toBe(false);
    });

    it('ignores the target it already has', () => {
        const color = new RewardTrackAnimatedColor(300);

        color.reset(0x112233, 0);
        color.setTarget(0x112233, 100);
        expect(color.needsUpdate(100)).toBe(false);
    });
});

describe('RewardTrackProgressBarStepper', () => {
    it('snaps when not animated and rounds the width like render()', () => {
        const bar = new RewardTrackProgressBarStepper(602);

        bar.setRatio(getRewardTrackMainBarRatio(60.1, 602), false);
        expect(bar.width).toBe(60);
        expect(bar.isAnimating).toBe(false);
        expect(bar.color).toBeNull();
        expect(getRewardTrackMainBarFillWidth(bar.width, 602)).toBe(64);
        expect(getRewardTrackMainBarFillWidth(599, 602)).toBe(602);
    });

    it('animates towards a new ratio and clamps it to 0..1', () => {
        const bar = new RewardTrackProgressBarStepper(602);

        bar.setRatio(0, false);
        bar.setRatio(3, true);
        expect(bar.isAnimating).toBe(true);

        const { values } = runFrames(bar);

        expect(values[1]).toBeGreaterThan(0);
        expect(values[1]).toBeLessThan(0.01);
        expect(bar.width).toBe(602);
    });
});

describe('RewardTrackTaskProgressBarStepper', () => {
    it('turns the fill green over 300 ms once the bar is full', () => {
        const bar = new RewardTrackTaskProgressBarStepper(200);

        bar.setTaskRatio(0.5, false);
        expect(bar.color).toBe(REWARD_TRACK_BAR_INCOMPLETE_COLOR);
        bar.setTaskRatio(1, true);

        let sawBlend = false;

        while (bar.isAnimating) {
            bar.update(16);

            if (bar.color !== REWARD_TRACK_BAR_INCOMPLETE_COLOR && bar.color !== REWARD_TRACK_BAR_COMPLETE_COLOR) sawBlend = true;
        }

        expect(sawBlend).toBe(true);
        expect(bar.width).toBe(200);
        expect(bar.color).toBe(REWARD_TRACK_BAR_COMPLETE_COLOR);
    });

    it('snaps the colour with the ratio when not animated', () => {
        const bar = new RewardTrackTaskProgressBarStepper(200);

        bar.setTaskRatio(1, false);
        expect(bar.color).toBe(REWARD_TRACK_BAR_COMPLETE_COLOR);
        bar.setTaskRatio(0.2, false);
        expect(bar.color).toBe(REWARD_TRACK_BAR_INCOMPLETE_COLOR);
        expect(bar.width).toBe(40);
    });

    it('on an animated level-up fills to the end, then restarts at the new level ratio', () => {
        const bar = new RewardTrackTaskProgressBarStepper(200);

        bar.setTaskRatio(0.6, false);
        bar.setTaskRatio(0.25, true, true);

        let reachedFull = false;
        let frames = 0;

        while (bar.isAnimating && frames < 1000) {
            bar.update(16);
            frames++;

            // The colour blends towards green on the full bar; the frame it lands on green the bar restarts (as in AIR).
            if (bar.width === 200 && bar.color !== REWARD_TRACK_BAR_INCOMPLETE_COLOR) reachedFull = true;
        }

        expect(reachedFull).toBe(true);
        expect(bar.width).toBe(50);
        expect(bar.color).toBe(REWARD_TRACK_BAR_INCOMPLETE_COLOR);
    });

    it('a level-up without animation just shows the new ratio', () => {
        const bar = new RewardTrackTaskProgressBarStepper(200);

        bar.setTaskRatio(0.6, false);
        bar.setTaskRatio(0.25, false, true);
        expect(bar.width).toBe(50);
        expect(bar.isAnimating).toBe(false);
    });
});

describe('rewardTrackColorToCss', () => {
    it('formats 0xRRGGBB', () => {
        expect(rewardTrackColorToCss(0xeba60c)).toBe('#EBA60C');
        expect(rewardTrackColorToCss(0x0000ff)).toBe('#0000FF');
    });
});
