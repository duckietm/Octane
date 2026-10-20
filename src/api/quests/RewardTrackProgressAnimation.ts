/**
 * The official reward track progress bar motion, ported 1:1 from the AIR client:
 *
 * - RewardTrackValueMover: the accelerated value AIR's RewardTrackProgressBarViewBase moves (an unnamed
 *   class in HabboAirLauncher.deobf.js): constant acceleration towards the target, capped speed, braking
 *   in time to stop on it, integrated in steps of at most 8 ms.
 * - RewardTrackAnimatedColor: com/sulake/habbo/window/utils/AnimatedColor, a linear per-channel blend.
 * - RewardTrackProgressBarStepper: RewardTrackProgressBarViewBase (the main bar uses it bare).
 * - RewardTrackTaskProgressBarStepper: RewardTrackTaskProgressBarView (task rows and levels: the
 *   orange / green fill colour and the level-up "fill to full, then restart" step).
 *
 * Time is the sum of the frame deltas handed to update(), as AIR's views keep it.
 */

/** RewardTrackProgressBarViewBase.ACCELERATION_PER_MS (bar ratio per ms²). */
export const REWARD_TRACK_BAR_ACCELERATION_PER_MS = 1e-5;
/** RewardTrackProgressBarViewBase.MAX_SPEED_PER_MS (bar ratio per ms). */
export const REWARD_TRACK_BAR_MAX_SPEED_PER_MS = 0.003;
/** RewardTrackProgressBarViewBase min-speed / settle threshold (const_296). */
export const REWARD_TRACK_BAR_MIN_SPEED_PER_MS = 1e-4;
/** RewardTrackProgressBarViewBase.FILL_COLOR_TRANSITION_MS. */
export const REWARD_TRACK_BAR_FILL_COLOR_TRANSITION_MS = 300;
/** RewardTrackProgressBarViewBase.INCOMPLETE_COLOR (0xEBA60C). */
export const REWARD_TRACK_BAR_INCOMPLETE_COLOR = 0xeba60c;
/** RewardTrackProgressBarViewBase.COMPLETE_COLOR (0x71AF24). */
export const REWARD_TRACK_BAR_COMPLETE_COLOR = 0x71af24;

const MOVER_MAX_STEP_MS = 8;

const sign = (value: number): number => (value > 0 ? 1 : value < 0 ? -1 : 0);

export class RewardTrackValueMover {
    private readonly _acceleration: number;
    private readonly _maxSpeed: number;
    private readonly _epsilon: number;
    private _lastTime = 0;
    private _velocity = 0;
    private _target = 0;
    private _value = 0;

    constructor(acceleration: number, maxSpeed: number, epsilon: number) {
        this._acceleration = Math.max(0, acceleration);
        this._maxSpeed = Math.max(0, maxSpeed);
        this._epsilon = Math.max(0, epsilon);
    }

    public get value(): number {
        return this._value;
    }

    public get target(): number {
        return this._target;
    }

    public get velocity(): number {
        return this._velocity;
    }

    /** Jumps to `value` without motion. */
    public reset(value: number, time: number): void {
        this._lastTime = time;
        this._velocity = 0;
        this._target = value;
        this._value = value;
    }

    /** Moves towards `value` from where it is now, keeping its speed (turned towards the new target). */
    public setTarget(value: number, time: number): void {
        this.update(time);
        this._target = value;
        this._lastTime = time;

        const direction = this.direction();

        if (direction === 0) {
            this.settle();

            return;
        }

        this._velocity = direction * Math.min(Math.abs(this._velocity), this._maxSpeed);
    }

    /** True while the value (seen at `scale` pixels when given) has not reached the target. */
    public needsUpdate(_time: number, scale = 1): boolean {
        if (scale > 0 && ((this._target * scale) | 0) !== ((this._value * scale) | 0)) return true;

        return Math.abs(this._target - this._value) > this._epsilon || Math.abs(this._velocity) > this._epsilon;
    }

    /** Advances to `time`; true when the value changed. */
    public update(time: number): boolean {
        let remaining = Math.max(0, time - this._lastTime);

        if (remaining <= 0 || this.isSettled()) {
            this._lastTime = time;

            return false;
        }

        const previous = this._value;

        while (remaining > 0 && !this.isSettled()) {
            const step = Math.min(remaining, MOVER_MAX_STEP_MS);

            this.step(step);
            remaining -= step;
        }

        this._lastTime = time;

        return this._value !== previous;
    }

    private settle(): boolean {
        const changed = this._value !== this._target || this._velocity !== 0;

        this._value = this._target;
        this._velocity = 0;

        return changed;
    }

    private step(dt: number): void {
        const distance = this._target - this._value;
        const direction = sign(distance);

        if (direction === 0 || Math.abs(distance) <= this._epsilon) {
            this.settle();

            return;
        }

        const acceleration = this.accelerationTowards(direction);
        const next = this._value + this._velocity * dt + 0.5 * acceleration * dt * dt;
        let velocity = this._velocity + acceleration * dt;

        if (sign(this._target - next) !== direction || Math.abs(this._target - next) <= this._epsilon) {
            this.settle();

            return;
        }

        if (this._maxSpeed > 0 && Math.abs(velocity) > this._maxSpeed) velocity = sign(velocity) * this._maxSpeed;

        if (this._velocity !== 0 && sign(velocity) !== sign(this._velocity) && sign(acceleration) !== direction) velocity = 0;

        this._value = next;
        this._velocity = velocity;
    }

    private accelerationTowards(direction: number): number {
        if (this._acceleration <= 0) return 0;

        const speed = this._velocity * direction;

        if (speed < 0) return direction * this._acceleration;

        // Brake when the stopping distance reaches the distance left.
        if ((speed * speed) / (2 * this._acceleration) >= Math.abs(this._target - this._value)) return -direction * this._acceleration;

        if (this._maxSpeed > 0 && speed >= this._maxSpeed) return 0;

        return direction * this._acceleration;
    }

    private direction(): number {
        const distance = this._target - this._value;

        return Math.abs(distance) <= this._epsilon ? 0 : sign(distance);
    }

    private isSettled(): boolean {
        return Math.abs(this._target - this._value) <= this._epsilon && Math.abs(this._velocity) <= this._epsilon;
    }
}

export class RewardTrackAnimatedColor {
    private readonly _durationMs: number;
    private _source = 0;
    private _startTime = 0;
    private _target = 0;
    private _value = 0;

    constructor(durationMs: number) {
        this._durationMs = Math.max(0, durationMs);
    }

    public get value(): number {
        return this._value;
    }

    public reset(color: number, time: number): void {
        const normalized = color & 0xffffff;

        this._source = normalized;
        this._startTime = time;
        this._target = normalized;
        this._value = normalized;
    }

    public setTarget(color: number, time: number): void {
        const normalized = color & 0xffffff;

        if (normalized === this._target) return;

        this.update(time);
        this._source = this._value;
        this._startTime = time;
        this._target = normalized;
    }

    public needsUpdate(_time: number): boolean {
        return this._value !== this._target;
    }

    public update(time: number): boolean {
        const previous = this._value;

        if (this._durationMs === 0 || time >= this._startTime + this._durationMs) {
            this._value = this._target;

            return previous !== this._value;
        }

        const progress = Math.max(0, (time - this._startTime) / this._durationMs);
        const channel = (shift: number) => Math.round(((this._source >> shift) & 255) + (((this._target >> shift) & 255) - ((this._source >> shift) & 255)) * progress);

        this._value = (channel(16) << 16) | (channel(8) << 8) | channel(0);

        return previous !== this._value;
    }
}

const clampRatio = (ratio: number): number => Math.max(0, Math.min(1, ratio));

export class RewardTrackProgressBarStepper {
    protected readonly _maxWidth: number;
    protected readonly _mover = new RewardTrackValueMover(
        REWARD_TRACK_BAR_ACCELERATION_PER_MS,
        REWARD_TRACK_BAR_MAX_SPEED_PER_MS,
        REWARD_TRACK_BAR_MIN_SPEED_PER_MS
    );
    protected readonly _completionColor: RewardTrackAnimatedColor = null;
    protected _time = 0;

    /** `maxWidth`: the bar container's width; `withCompletionColor`: the task bars' orange / green fill. */
    constructor(maxWidth: number, withCompletionColor = false) {
        this._maxWidth = maxWidth;

        if (withCompletionColor) {
            this._completionColor = new RewardTrackAnimatedColor(REWARD_TRACK_BAR_FILL_COLOR_TRANSITION_MS);
            this._completionColor.reset(REWARD_TRACK_BAR_INCOMPLETE_COLOR, this._time);
        }
    }

    public setRatio(ratio: number, animate: boolean): void {
        const target = clampRatio(ratio);

        if (animate) this._mover.setTarget(target, this._time);
        else this._mover.reset(target, this._time);

        this.syncCompletionColor(animate);
    }

    /** Advances by one frame of `deltaMs`; true when the drawn bar changed. */
    public update(deltaMs: number): boolean {
        this._time += deltaMs;

        const before = this.width;
        const beforeColor = this.color;

        this._mover.update(this._time);

        if (this._completionColor) {
            this.syncCompletionColor(true);
            this._completionColor.update(this._time);
        }

        return before !== this.width || beforeColor !== this.color;
    }

    /** RewardTrackProgressBarViewBase.isUpdating. */
    public get isUpdating(): boolean {
        return this._mover.needsUpdate(this._time, this._maxWidth) || (this._completionColor !== null && this._completionColor.needsUpdate(this._time));
    }

    /** True while frames are still needed. */
    public get isAnimating(): boolean {
        return this.isUpdating;
    }

    public get value(): number {
        return this._mover.value;
    }

    /** RewardTrackProgressBarViewBase.render(): the `progress` container width. */
    public get width(): number {
        return Math.max(0, Math.min(this._maxWidth, Math.round(this._maxWidth * this._mover.value)));
    }

    /** The task bar's fill colour (0xRRGGBB), or null for the main bar. */
    public get color(): number {
        return this._completionColor ? this._completionColor.value : null;
    }

    protected syncCompletionColor(animate: boolean): void {
        if (!this._completionColor) return;

        const color = this._mover.value >= 1 ? REWARD_TRACK_BAR_COMPLETE_COLOR : REWARD_TRACK_BAR_INCOMPLETE_COLOR;

        if (animate) this._completionColor.setTarget(color, this._time);
        else this._completionColor.reset(color, this._time);
    }
}

export class RewardTrackTaskProgressBarStepper extends RewardTrackProgressBarStepper {
    private _pendingRatio = -1;

    constructor(maxWidth: number) {
        super(maxWidth, true);
    }

    /**
     * RewardTrackTaskProgressBarView: on an animated level-up the bar first fills to the end (and turns
     * green), then jumps to the new level's ratio once that has finished.
     */
    public setTaskRatio(ratio: number, animate: boolean, levelChanged = false): void {
        if (levelChanged && animate) {
            this._pendingRatio = ratio;
            this.setRatio(1, true);

            return;
        }

        this._pendingRatio = -1;
        this.setRatio(ratio, animate);
    }

    public override update(deltaMs: number): boolean {
        let changed = super.update(deltaMs);

        if (this._pendingRatio >= 0 && !this.isUpdating) {
            const ratio = this._pendingRatio;
            const before = this.width;
            const beforeColor = this.color;

            this._pendingRatio = -1;
            this.setRatio(ratio, false);
            changed = changed || before !== this.width || beforeColor !== this.color;
        }

        return changed;
    }

    public override get isAnimating(): boolean {
        return this.isUpdating || this._pendingRatio >= 0;
    }
}

/** RewardTrackMainProgressBarView.refreshByX(): the ratio of a track x on the bar. */
export const getRewardTrackMainBarRatio = (x: number, barWidth: number): number => Math.trunc(x) / barWidth;

/** RewardTrackMainProgressBarView.render(): the green shape is 4px past the progress, the whole bar near the end. */
export const getRewardTrackMainBarFillWidth = (progressWidth: number, barWidth: number): number =>
    progressWidth >= barWidth - 4 ? barWidth : progressWidth + 4;

/** A 0xRRGGBB colour as a CSS hex string. */
export const rewardTrackColorToCss = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;
