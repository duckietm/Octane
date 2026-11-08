/**
 * The Lido's dive, as Habbo's Shockwave client played it (hh_room_pool: Jumping_Pelle_Class, Pelle_KeyDown_Class,
 * Pelle_Player_Class): every tenth of a second one key, or none, moves the diver. The same keys give the same dive,
 * which is how a dive is recorded and played again for the others.
 *
 * Keys: `a` and `d` in turn to run along the board, space to jump, then in the air `w`, `e`, `z`, `x` (held poses),
 * `a`, `d` (spins, looped) and `s` (a somersault: the diver turns upside down or back). `0`: no key.
 *
 * Coordinates are the original stage's (720 x 540): the tower view from the top of the board, then, below 511, the
 * pool view where the diver falls into the water.
 */

export type DiveKey = '0' | 'a' | 'd' | 'w' | 'e' | 's' | 'z' | 'x' | ' ';

const START = { h: 545, v: 99 };
const BOARD_END = 393;
const BOARD_START = 523;
const VELOCITY_V = 1.5;
const RUN_FRAMES = [ 0, 1, 2, 3, 3, 2, 1, 0 ];
/** Lingo's integer(): to the nearest. */
const int = (value: number): number => Math.round(value);
/** Lingo's division of two integers. */
const div = (a: number, b: number): number => Math.trunc(a / b);

export interface IDiver {
    status: 'run' | 'jump' | 'ready';
    screen: 'up' | 'down';
    h: number;
    v: number;
    newV: number;
    speed: number;
    jumpSpeed: number;
    action: string;
    frame: number;
    runCounter: number;
    direction: 'u' | 'd';
    loop: boolean;
    mode: 'active' | 'goinactive' | 'inactive' | '';
    maxFrames: number;
    lastKey: string;
    /** The big splash starts (the tick it did, -1 not yet), and the diver is under the water's surface. */
    splashTick: number;
    underWater: boolean;
    ticks: number;
}

export const newDiver = (): IDiver => ({
    status: 'run',
    screen: 'up',
    h: START.h,
    v: START.v,
    newV: START.v,
    speed: 0,
    jumpSpeed: 0,
    action: 'std',
    frame: 0,
    runCounter: 1,
    direction: 'u',
    loop: false,
    mode: '',
    maxFrames: 1,
    lastKey: '',
    splashTick: -1,
    underWater: false,
    ticks: 0
});

const stopRunning = (d: IDiver) => {
    if (d.status !== 'run') return;

    d.speed -= 0.1;

    if (d.speed <= 0) {
        d.action = 'std';
        d.frame = 0;
        d.speed = 0;
    }
};

const stopJumping = (d: IDiver) => {
    if (d.v > 511) {
        if (d.screen === 'up') {
            d.screen = 'down';
            d.v = -20;
            d.newV = d.v;
        }

        return;
    }

    if (d.screen !== 'down') return;

    const readyV = 310 + div(429 - d.h, 2);

    if (d.splashTick < 0 && d.v >= readyV - 40) d.splashTick = d.ticks;
    if (d.v >= readyV - 20) d.underWater = true;

    if (d.v >= readyV) {
        d.v = readyV;
        d.status = 'ready';
    }
};

const exitFrame = (d: IDiver) => {
    if (d.status === 'run') {
        if (d.action === 'run') {
            d.runCounter = d.runCounter + 1 > RUN_FRAMES.length ? 1 : d.runCounter + 1;
            d.frame = RUN_FRAMES[d.runCounter - 1];
            d.h -= 2 * int(d.speed);
            d.newV += int(d.speed);
            d.v = d.speed > 1 ? d.newV - d.frame : d.newV;
        }

        if (d.h <= BOARD_END + 3) {
            d.frame = 1;
            d.status = 'jump';
            d.jumpSpeed = 1;
        } else {
            d.speed = Math.max(0, d.speed - 0.05);
        }

        stopRunning(d);
        return;
    }

    if (d.status !== 'jump') return;

    let boardV = 0;

    d.h -= 2 * int(d.speed);
    d.newV += int(d.speed) - d.jumpSpeed;
    d.v = d.newV;
    d.jumpSpeed -= VELOCITY_V;

    if (d.h > BOARD_END) {
        boardV = START.v + div(START.h - d.h, 2);

        if (d.v >= boardV) {
            d.v = boardV;
            d.status = 'run';
            d.action = 'std';
            d.frame = 0;
            stopRunning(d);
            d.jumpSpeed = 0;
        }
    } else {
        if (d.jumpSpeed < -12) d.jumpSpeed = -12;

        d.speed = Math.max(0, d.speed - 0.08);
    }

    if (d.status !== 'jump') return;

    if (d.h > BOARD_END && d.v - 3 > boardV) d.mode = 'goinactive';
    if (d.mode === 'active' && !d.loop && d.lastKey !== d.action.charAt(2)) d.mode = 'goinactive';
    if (d.action === 'jus' || d.action === 'jds') d.mode = 'active';

    if (d.mode === 'active') {
        d.frame++;

        if (d.frame > d.maxFrames) d.frame = d.loop ? 0 : d.maxFrames;

        if (d.frame === d.maxFrames && (d.action === 'jus' || d.action === 'jds')) {
            d.frame = 1;
            d.maxFrames = 1;
            d.direction = d.direction === 'u' ? 'd' : 'u';
            d.action = `j${ d.direction }n`;
        }
    } else if (d.mode === 'goinactive') {
        if (d.loop) {
            d.frame = 0;
            d.mode = 'inactive';
        } else {
            d.frame--;

            if (d.frame < 0) {
                d.frame = 0;
                d.mode = 'inactive';
            }
        }

        if (d.action === 'jun' || d.action === 'jdn') d.frame = 1;
    } else if (d.mode === 'inactive') {
        d.action = 'jmp';
        d.frame = d.jumpSpeed > 0 ? 2 : 0;

        if (d.jumpSpeed < -5) {
            d.frame = 1;
            d.maxFrames = 1;
            d.action = `j${ d.direction }n`;
        }
    }

    if (d.v > 511) {
        d.status = 'run';
        d.speed = 0;
        stopJumping(d);
    }

    stopJumping(d);
};

const pose = (d: IDiver, key: string, loop: boolean, frames: number) => {
    const action = `j${ d.direction }${ key }`;

    if (d.action !== action) d.frame = 0;

    d.action = action;
    d.loop = loop;
    d.mode = 'active';
    d.maxFrames = frames;
};

const keyDown = (d: IDiver, key: DiveKey) => {
    if (d.status === 'run') {
        if (key === 'a' || key === 'd') {
            if (key !== d.lastKey) {
                d.action = 'run';
                d.speed = Math.min(4, d.speed + 0.6);
            }
        } else if (key === ' ') {
            d.loop = true;
            d.action = 'jmp';
            d.frame = 1;
            d.status = 'jump';
            d.jumpSpeed = 0;

            if (d.h < BOARD_START && d.h > BOARD_END) d.jumpSpeed = div(BOARD_START - d.h, 22) * d.speed;

            d.jumpSpeed += 5;
            d.direction = 'u';

            if (d.speed < 1) d.speed += 0.5;
        } else {
            d.speed = Math.max(0, d.speed - 0.2);
        }
    } else if (d.status === 'jump') {
        const broken = !d.loop && key !== d.action.charAt(2) && d.action !== 'jun' && d.action !== 'jdn';

        if (!broken) {
            switch (key) {
                case 'w': case 'e': case 'z': case 'x':
                    pose(d, key, false, 1);
                    break;
                case 'a':
                    pose(d, key, true, d.direction === 'u' ? 4 : 7);
                    break;
                case 'd':
                    pose(d, key, true, d.direction === 'u' ? 6 : 5);
                    break;
                case 's':
                    if (d.h > BOARD_END) d.direction = 'u';
                    else pose(d, key, false, 3);
                    break;
            }
        }
    }

    d.lastKey = key;
    exitFrame(d);
};

/** One tenth of a second: a key held, or none. */
export const diveStep = (d: IDiver, key: DiveKey) => {
    d.ticks++;

    if (key === '0') {
        d.mode = 'inactive';
        exitFrame(d);
    } else {
        keyDown(d, key);
    }
};

/** The keys of a dive as recorded (`0` for no key), played from the start: the diver at each tenth of a second. */
export const replayDive = (keys: string): IDiver[] => {
    const diver = newDiver();
    const frames: IDiver[] = [ { ...diver } ];
    const padded = `0000${ keys }0000000000`;

    for (const key of padded) {
        if (diver.status === 'ready') break;

        diveStep(diver, (key as DiveKey));
        frames.push({ ...diver });
    }

    // After the last key the diver still falls: one step without key until the water.
    for (let guard = 0; guard < 200 && diver.status !== 'ready'; guard++) {
        diveStep(diver, '0');
        frames.push({ ...diver });
    }

    return frames;
};

/** The parts the diver is drawn with, in this order, as UpdatePelle drew them. */
export const DIVER_PARTS = [ 'bd', 'lh', 'hd', 'fc', 'hr', 'ch', 'rh' ] as const;

export type DiverPart = typeof DIVER_PARTS[number];

/** The cast member of a part in the diver's current pose (the head always stands, turned when upside down). */
export const partMember = (d: IDiver, part: DiverPart, models: Record<DiverPart, string>): string[] => {
    if (part === 'bd' || part === 'lh' || part === 'ch' || part === 'rh') {
        const direction = d.action.includes('jd') ? 0 : 2;

        return [ `sh_${ d.action }_${ part }_${ models[part] }_${ direction }_${ d.frame }`, `sh_std_${ part }_${ models[part] }_2_0` ];
    }

    const direction = d.direction === 'd' || (d.action.includes('jus') && d.frame === 2) ? 0 : 2;

    return [ `sh_std_${ part }_${ models[part] }_${ direction }_0` ];
};
