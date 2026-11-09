/**
 * Timing of the AIR SnowWar HUD animations (SnowWarUI / SnowWarAnimated
 * WindowElement), as pure functions of the elapsed time so the arena view can
 * draw them from its frame clock. Frame numbers are the AIR asset numbers
 * (1-based); 0 means "show nothing".
 */

/**
 * SnowWarUI.updateScoreFlash: after a hit the own-stats panel flashes
 * `ui_me_minus_N` (you were hit) or `ui_me_plus_N` (your ball hit someone),
 * frames 1-4 at 50 ms each.
 */
export const SNOWWAR_SCORE_FLASH_FRAME_MS = 50;
export const SNOWWAR_SCORE_FLASH_FRAMES = 4;

export const getScoreFlashFrame = (elapsedMs: number): number =>
{
    if (elapsedMs < 0) return 0;

    const frame = Math.floor(elapsedMs / SNOWWAR_SCORE_FLASH_FRAME_MS) + 1;

    return (frame > SNOWWAR_SCORE_FLASH_FRAMES) ? 0 : frame;
};

/**
 * SnowWarAnimatedWindowElement with `loop = true`: the frames run 1..n and
 * back down to 2 (ping-pong), one step per `frameMs`. Used by `ui_no_balls_`
 * (4 frames, 75 ms) while the player has no snowballs.
 */
export const getPingPongFrame = (nowMs: number, frames: number, frameMs: number): number =>
{
    if (frames <= 1) return 1;

    const sequence = (frames * 2) - 2;
    const step = Math.floor(Math.max(0, nowMs) / frameMs) % sequence;

    return (step < frames) ? step + 1 : (sequence - step) + 1;
};

/** SnowWarAnimatedWindowElement without loop: `load_1..8` at 100 ms while making a snowball. */
export const getLoopFrame = (nowMs: number, frames: number, frameMs = 100): number =>
    (frames <= 0) ? 0 : (Math.floor(Math.max(0, nowMs) / frameMs) % frames) + 1;

/**
 * SnowWarUI.updateCounterImage: the pre-match counter. `explosion0001-0005`
 * are the digits 5..1 (one second each), then `explosion0006-0010` burst at
 * 100 ms each when the match starts. Timed back from the end of the
 * preparing phase, so a longer preparing time first shows only "Get ready".
 */
export const SNOWWAR_COUNTDOWN_DIGIT_MS = 1000;
export const SNOWWAR_COUNTDOWN_DIGITS = 5;
export const SNOWWAR_COUNTDOWN_BURST_MS = 100;
export const SNOWWAR_COUNTDOWN_BURST_FRAMES = 5;

export const getCountdownFrame = (nowMs: number, preparingEndsAt: number): number =>
{
    if (!preparingEndsAt) return 0;

    const elapsed = nowMs - (preparingEndsAt - (SNOWWAR_COUNTDOWN_DIGITS * SNOWWAR_COUNTDOWN_DIGIT_MS));

    if (elapsed < 0) return 0;

    if (elapsed < (SNOWWAR_COUNTDOWN_DIGITS * SNOWWAR_COUNTDOWN_DIGIT_MS)) return Math.floor(elapsed / SNOWWAR_COUNTDOWN_DIGIT_MS) + 1;

    const burst = Math.floor((elapsed - (SNOWWAR_COUNTDOWN_DIGITS * SNOWWAR_COUNTDOWN_DIGIT_MS)) / SNOWWAR_COUNTDOWN_BURST_MS);

    return (burst < SNOWWAR_COUNTDOWN_BURST_FRAMES) ? SNOWWAR_COUNTDOWN_DIGITS + 1 + burst : 0;
};

/** AIR asset offsets of `explosion000N` (drawn at -offset inside the 164x164 counter). */
export const SNOWWAR_EXPLOSION_OFFSETS: Readonly<Record<number, readonly [number, number]>> = {
    1: [ -64, -64 ],
    2: [ -59, -58 ],
    3: [ -55, -53 ],
    4: [ -51, -46 ],
    5: [ -60, -39 ],
    6: [ -35, -31 ],
    7: [ -28, -23 ],
    8: [ -28, -23 ],
    9: [ -25, -25 ],
    10: [ -52, -39 ]
};

export const getExplosionAssetName = (frame: number): string => `explosion${ frame.toString().padStart(4, '0') }`;
