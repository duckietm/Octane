import { FC, useEffect, useRef, useState } from 'react';
import { HallApi, IHallBoard, IHallTable, IHallView, hallt } from '../../api';

/**
 * Tetris in duel: the player's own board, played here (10 x 20, the seven pieces from a bag, rotation with small wall
 * kicks, a ghost, hold, hard and soft drops), and the others' boards as they send them. Lines cleared together send
 * rubbish to the others (the server shares it out); rubbish received rises from the bottom. The board is sent to the
 * server when a piece locks and every 1.5 s.
 */
const W = 10;
const H = 20;
const SHAPES: number[][][] = [
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

interface IPiece { type: number; rot: number; x: number; y: number }

const cellsOf = (piece: IPiece): [number, number][] => {
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

class Engine {
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

const Cell: FC<{ value: number; ghost?: boolean }> = ({ value, ghost = false }) => <span className={`hall-tetris__cell ${value ? `is-${value}` : ''} ${ghost ? 'is-ghost' : ''}`} />;

const MiniPiece: FC<{ type: number }> = ({ type }) => {
    if (type < 0) return <span className="hall-tetris__mini-piece" />;

    const cells = new Set(SHAPES[type].map(([ x, y ]) => y * 4 + x));

    return (
        <span className="hall-tetris__mini-piece">
            {Array.from({ length: 8 }, (_, index) => <Cell key={index} value={cells.has(index) ? type + 1 : 0} />)}
        </span>
    );
};

export const TetrisBoard: FC<{ board: IHallBoard; table: IHallTable; onView: (view: IHallView) => void }> = ({ board, table, onView }) => {
    const engineRef = useRef(new Engine());
    const sentAt = useRef(0);
    const [ , setFrame ] = useState(0);
    const boards = (board.boards as { board: string; lines: number; score: number; level: number; received: number; out: boolean; place: number }[]) ?? [];
    const mine = boards[table.you];
    const startsIn = Number(board.startsIn ?? 0);
    const playing = table.state === 'playing' && !!mine && !mine.out && startsIn <= 0;
    const engine = engineRef.current;

    const send = (extra: Record<string, unknown> = {}) => {
        sentAt.current = performance.now();
        HallApi.move('tetris', { board: engine.snapshot(), lines: engine.lines, score: engine.score, level: engine.level, ...extra }).then(onView).catch(() => undefined);
    };

    // Rubbish received from the others.
    useEffect(() => {
        if (!mine || !playing) return;

        const incoming = mine.received - engine.applied;

        if (incoming > 0) {
            engine.applied = mine.received;
            engine.addRubbish(incoming);
        }
    }, [ mine?.received, playing ]);

    useEffect(() => {
        if (!playing) return;

        if (!engine.piece) engine.start(performance.now());

        let handle = 0;
        const loop = () => {
            const now = performance.now();
            const cleared = engine.step(now);

            if (engine.out) {
                send({ out: true, cleared: 0 });
                setFrame((value) => value + 1);
                return;
            }

            if (cleared !== 0) send({ cleared: Math.max(0, cleared) });
            else if (now - sentAt.current > 1500) send({ cleared: 0 });

            setFrame((value) => value + 1);
            handle = requestAnimationFrame(loop);
        };

        handle = requestAnimationFrame(loop);

        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (engine.out || !engine.piece || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            const now = performance.now();
            let handled = true;

            switch (event.key) {
                case 'ArrowLeft': engine.move(-1, now); break;
                case 'ArrowRight': engine.move(1, now); break;
                case 'ArrowDown':
                    if (engine.down()) engine.score += 1;
                    engine.dropAt = now + engine.gravity;
                    break;
                case 'ArrowUp': case 'x': case 'X': engine.rotate(1, now); break;
                case 'z': case 'Z': case 'w': case 'W': engine.rotate(-1, now); break;
                case 'c': case 'C': case 'Shift': engine.swapHold(now); break;
                case ' ': {
                    if (event.repeat) break;

                    const cleared = engine.hardDrop(now);

                    send(engine.out ? { out: true, cleared: 0 } : { cleared });
                    break;
                }
                default: handled = false;
            }

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
                setFrame((value) => value + 1);
            }
        };

        window.addEventListener('keydown', onKey, true);

        return () => {
            cancelAnimationFrame(handle);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [ playing ]);

    const ghost = engine.piece && !engine.out ? new Set(cellsOf(engine.ghost()).map(([ x, y ]) => y * W + x)) : new Set<number>();
    const live = engine.piece && !engine.out ? new Map(cellsOf(engine.piece).map(([ x, y ]) => [ y * W + x, engine.piece.type + 1 ])) : new Map<number, number>();
    const others = boards.map((entry, seat) => ({ entry, seat })).filter(({ seat }) => seat !== table.you);

    return (
        <div className="hall-tetris">
            {startsIn > 0 && table.state === 'playing' && <div className="hall-tetris__count" data-browser-text>{Math.ceil(startsIn / 1000)}</div>}
            <div className="hall-tetris__side" data-browser-text>
                <span className="hall-tetris__label">{hallt('tetris.hold', 'Hold (C)')}</span>
                <MiniPiece type={engine.hold} />
                <span className="hall-tetris__label">{hallt('tetris.score', 'Score')}</span>
                <strong>{engine.score}</strong>
                <span className="hall-tetris__label">{hallt('tetris.lines', 'Lines')}</span>
                <strong>{engine.lines}</strong>
                <span className="hall-tetris__label">{hallt('tetris.level', 'Level')}</span>
                <strong>{engine.level}</strong>
            </div>
            <div className={`hall-tetris__grid ${engine.out || mine?.out ? 'is-out' : ''}`}>
                {engine.grid.map((value, index) => <Cell key={index} value={live.get(index) ?? value} ghost={!value && !live.has(index) && ghost.has(index)} />)}
                {(engine.out || mine?.out) && <span className="hall-tetris__over" data-browser-text>{mine?.place ? hallt('tetris.place', 'Place: %n%', [ 'n' ], [ String(mine.place) ]) : hallt('tetris.out', 'Topped out!')}</span>}
            </div>
            <div className="hall-tetris__side" data-browser-text>
                <span className="hall-tetris__label">{hallt('tetris.next', 'Next')}</span>
                {engine.queue.slice(0, 3).map((type, index) => <MiniPiece key={index} type={type} />)}
                <span className="hall-tetris__keys">{hallt('tetris.keys', '← → move · ↑ turn · ↓ down · space: drop')}</span>
            </div>
            <div className="hall-tetris__others">
                {others.map(({ entry, seat }) => (
                    <div key={seat} className={`hall-tetris__other ${entry.out ? 'is-out' : ''}`} data-browser-text>
                        <span className="hall-tetris__label">{table.players[seat]?.name ?? ''}</span>
                        <div className="hall-tetris__minigrid">
                            {[ ...entry.board ].map((value, index) => <Cell key={index} value={value === '.' ? 0 : Number(value)} />)}
                        </div>
                        <span>{entry.score} · {entry.lines} {hallt('tetris.lines_short', 'lines')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
