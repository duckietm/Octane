/**
 * HabboKart's circuit, the same as the server's (KartTrack.java): a closed loop through the control points (world
 * pixels), smoothed as a uniform Catmull-Rom curve of STEPS samples a section; the start line is on the first point.
 */
export const KART_CONTROLS: [number, number][] = [
    [ 500, 1500 ], [ 520, 900 ], [ 800, 520 ], [ 1350, 430 ], [ 1800, 620 ], [ 2250, 580 ], [ 2750, 450 ], [ 3150, 680 ],
    [ 3250, 1150 ], [ 2950, 1520 ], [ 2400, 1520 ], [ 2000, 1700 ], [ 1900, 2050 ], [ 1600, 2330 ], [ 1050, 2320 ], [ 620, 2050 ]
];
export const KART_STEPS = 24;
export const KART_WIDTH = 220;

const curve = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

export class KartTrack {
    readonly xs: number[] = [];
    readonly ys: number[] = [];
    readonly along: number[] = [ 0 ];
    readonly length: number;

    constructor(controls: [number, number][] = KART_CONTROLS) {
        const n = controls.length;

        for (let section = 0; section < n; section++) {
            const p0 = controls[(section - 1 + n) % n];
            const p1 = controls[section];
            const p2 = controls[(section + 1) % n];
            const p3 = controls[(section + 2) % n];

            for (let step = 0; step < KART_STEPS; step++) {
                const t = step / KART_STEPS;

                this.xs.push(curve(p0[0], p1[0], p2[0], p3[0], t));
                this.ys.push(curve(p0[1], p1[1], p2[1], p3[1], t));
            }
        }

        for (let index = 0; index < this.xs.length; index++) {
            const next = (index + 1) % this.xs.length;

            this.along.push(this.along[index] + Math.hypot(this.xs[next] - this.xs[index], this.ys[next] - this.ys[index]));
        }

        this.length = this.along[this.xs.length];
    }

    /** The point at a distance along the road, moved sideways: [x, y, heading]. */
    pointAt(distance: number, side = 0): [number, number, number] {
        const wrapped = ((distance % this.length) + this.length) % this.length;
        let low = 0;
        let high = this.xs.length - 1;

        while (low < high) {
            const middle = Math.ceil((low + high) / 2);

            if (this.along[middle] <= wrapped) low = middle;
            else high = middle - 1;
        }

        const next = (low + 1) % this.xs.length;
        const span = this.along[low + 1] - this.along[low];
        const t = span <= 0 ? 0 : (wrapped - this.along[low]) / span;
        const dx = this.xs[next] - this.xs[low];
        const dy = this.ys[next] - this.ys[low];
        const heading = Math.atan2(dy, dx);

        return [ this.xs[low] + dx * t - Math.sin(heading) * side, this.ys[low] + dy * t + Math.cos(heading) * side, heading ];
    }

    /** Where a point is along the road, and how far from its middle: [along, distance]. */
    locate(x: number, y: number): [number, number] {
        let best = Infinity;
        let bestAlong = 0;

        for (let index = 0; index < this.xs.length; index++) {
            const next = (index + 1) % this.xs.length;
            const ax = this.xs[index];
            const ay = this.ys[index];
            const dx = this.xs[next] - ax;
            const dy = this.ys[next] - ay;
            const square = dx * dx + dy * dy;
            const t = square === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / square));
            const distance = Math.hypot(ax + dx * t - x, ay + dy * t - y);

            if (distance < best) {
                best = distance;
                bestAlong = this.along[index] + t * Math.sqrt(square);
            }
        }

        return [ bestAlong, best ];
    }
}

export const KART_TRACK = new KartTrack();

/** The item boxes, as the server places them: rows along a lap, places across the road. */
export const KART_BOX_ROWS = [ 0.18, 0.47, 0.76 ];
export const KART_BOX_SIDES = [ -72, -24, 24, 72 ];

export const kartBox = (index: number): [number, number, number] =>
    KART_TRACK.pointAt(KART_BOX_ROWS[Math.floor(index / KART_BOX_SIDES.length)] * KART_TRACK.length, KART_BOX_SIDES[index % KART_BOX_SIDES.length]);
