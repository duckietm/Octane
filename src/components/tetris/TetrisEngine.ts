/**
 * The falling blocks, played in the player's window: a 10 x 20 well, the seven pieces drawn from a bag, turning with
 * small wall kicks, a shadow of where the piece lands, a held piece, soft and hard drops, and the rubbish rows the
 * others send, rising from the bottom with a hole in each.
 */
export const W = 10;
export const H = 20;
export const SHAPES: number[][][] = [
    [ [ 0, 1 ], [ 1, 1 ], [ 2, 1 ], [ 3, 1 ] ], // I
    [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 2, 1 ] ], // J
    [ [ 2, 0 ], [ 0, 1 ], [ 1, 1 ], [ 2, 1 ] ], // L
    [ [ 1, 0 ], [ 2, 0 ], [ 1, 1 ], [ 2, 1 ] ], // O
    [ [ 1, 0 ], [ 2, 0 ], [ 0, 1 ], [ 1, 1 ] ], // S
    [ [ 1, 0 ], [ 0, 1 ], [ 1, 1 ], [ 2, 1 ] ], // T
    [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 2, 1 ] ] // Z
];
const SIZES = [ 4, 3, 3, 4, 3, 3, 3 ];
const POINTS = [ 0, 100, 300, 500, 800 ];

export interface IPiece { type: number; rot: number; x: number; y: number }

export const cellsOf = (piece: IPiece): [number, number][] => {
    const size = SIZES[piece.type];

    return SHAPES[piece.type].map(([ cx, cy ]) => {
        let x = cx;
        let y = cy;

        for (let r = 0; r < ((piece.rot % 4) + 4) % 4; r++) {
            const nx = size - 1 - y;

            y = x;
            x = nx;
        }

        return [ piece.x + x, piece.y + y ] as [number, number];
    });
};

export class TetrisEngine {
    grid: number[] = new Array(W * H).fill(0);
    bag: number[] = [];
    queue: number[] = [];
    piece: IPiece = null;
    hold = -1;
    held = false;
    lines = 0;
    score = 0;
    out = false;
    applied = 0;
    dropAt = 0;
    lockAt = -1;
    lastCleared = 0;

    get level(): number {
        return 1 + Math.floor(this.lines / 10);
    }

    get gravity(): number {
        return Math.max(60, 800 - (this.level - 1) * 70);
    }

    private take(): number {
        if (!this.bag.length) {
            this.bag = [ 0, 1, 2, 3, 4, 5, 6 ];

            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));

                [ this.bag[i], this.bag[j] ] = [ this.bag[j], this.bag[i] ];
            }
        }

        return this.bag.pop();
    }

    start(now: number) {
        while (this.queue.length < 3) this.queue.push(this.take());

        this.spawn(this.queue.shift(), now);
    }

    fits(piece: IPiece): boolean {
        return cellsOf(piece).every(([ x, y ]) => x >= 0 && x < W && y < H && (y < 0 || !this.grid[y * W + x]));
    }

    spawn(type: number, now: number) {
        this.queue.push(this.take());
        this.piece = { type, rot: 0, x: 3, y: -1 };
        this.held = false;
        this.dropAt = now + this.gravity;
        this.lockAt = -1;

        if (!this.fits(this.piece)) this.out = true;
    }

    move(dx: number, now: number): boolean {
        const next = { ...this.piece, x: this.piece.x + dx };

        if (!this.fits(next)) return false;

        this.piece = next;
        if (this.lockAt >= 0) this.lockAt = now + 400;

        return true;
    }

    rotate(dir: number, now: number) {
        for (const kick of [ 0, -1, 1, -2, 2 ]) {
            const next = { ...this.piece, rot: this.piece.rot + dir, x: this.piece.x + kick };

            if (this.fits(next)) {
                this.piece = next;
                if (this.lockAt >= 0) this.lockAt = now + 400;
                return;
            }
        }
    }

    ghost(): IPiece {
        let ghost = this.piece;

        while (this.fits({ ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };

        return ghost;
    }

    /** One row down; false when it cannot (the piece rests). */
    down(): boolean {
        const next = { ...this.piece, y: this.piece.y + 1 };

        if (!this.fits(next)) return false;

        this.piece = next;
        return true;
    }

    hardDrop(now: number): number {
        let rows = 0;

        while (this.down()) rows++;

        this.score += rows * 2;
        return this.lock(now);
    }

    swapHold(now: number) {
        if (this.held) return;

        const current = this.piece.type;

        if (this.hold < 0) {
            this.hold = current;
            this.spawn(this.queue.shift(), now);
        } else {
            const type = this.hold;

            this.hold = current;
            this.queue.unshift(type);
            this.spawn(this.queue.shift(), now);
            this.queue.pop();
        }

        this.held = true;
    }

    /** The piece becomes part of the board; full rows go. Answers the rows cleared. */
    lock(now: number): number {
        for (const [ x, y ] of cellsOf(this.piece)) {
            if (y < 0) {
                this.out = true;
                return 0;
            }

            this.grid[y * W + x] = this.piece.type + 1;
        }

        let cleared = 0;

        for (let y = H - 1; y >= 0; y--) {
            if (this.grid.slice(y * W, y * W + W).every((cell) => cell)) {
                this.grid.splice(y * W, W);
                this.grid.unshift(...new Array(W).fill(0));
                cleared++;
                y++;
            }
        }

        this.lines += cleared;
        this.score += POINTS[cleared] * this.level;
        this.lastCleared = cleared;
        this.spawn(this.queue.shift(), now);

        return cleared;
    }

    /** Rubbish rows rise from the bottom, a hole in each (the same column for a batch). */
    addRubbish(count: number) {
        const hole = Math.floor(Math.random() * W);

        for (let i = 0; i < count; i++) {
            if (this.grid.slice(0, W).some((cell) => cell)) this.out = true;

            this.grid.splice(0, W);
            this.grid.push(...Array.from({ length: W }, (_, x) => (x === hole ? 0 : 8)));
        }

        if (this.piece && !this.fits(this.piece)) {
            const up = { ...this.piece, y: this.piece.y - count };

            if (this.fits(up)) this.piece = up;
        }
    }

    step(now: number): number {
        if (this.out || !this.piece) return 0;

        if (now >= this.dropAt) {
            this.dropAt = now + this.gravity;

            if (this.down()) {
                this.lockAt = -1;
            } else if (this.lockAt < 0) {
                this.lockAt = now + 400;
            }
        }

        if (this.lockAt >= 0 && now >= this.lockAt) {
            this.lockAt = -1;

            if (!this.fits({ ...this.piece, y: this.piece.y + 1 })) return this.lock(now) || -1;
        }

        return 0;
    }

    snapshot(): string {
        const cells = [ ...this.grid ];

        if (this.piece && !this.out) {
            for (const [ x, y ] of cellsOf(this.piece)) {
                if (y >= 0) cells[y * W + x] = this.piece.type + 1;
            }
        }

        return cells.map((cell) => (cell ? String(cell) : '.')).join('');
    }
}
