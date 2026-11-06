import { CSSProperties, FC, MouseEvent, useMemo, useState } from 'react';
import { IHallBoard, IHallTable, hallt } from '../../api';
import { Button } from '../../common';
import spritesData from '../../assets/images/hall/hall-sprites.json';
import spritesImage from '../../assets/images/hall/hall-sprites.png';
import battleshipsBoard from '../../assets/images/hall/hall-board-battleships.png';
import chessBoard from '../../assets/images/hall/hall-board-chess.png';
import chessGrid from '../../assets/images/hall/hall-chess-grid.png';
import connect4Board from '../../assets/images/hall/hall-board-connect4.png';
import tictactoeBoard from '../../assets/images/hall/hall-board-tictactoe.png';
import snailData from '../../assets/images/snails/snail-sprites.json';
import snailImage from '../../assets/images/snails/snail-sprites.png';
import snailTrack from '../../assets/images/snails/snail-track.png';

/**
 * The boards of the game hall, drawn with the Cunning Fox Gamehall's own pictures (the cards, the chess pieces and
 * board, tic-tac-toe's grid and marks, the battleships' radar sea and ships), twice their size unless said.
 */
const SHEET = spritesData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number]> };

type Play = (move: Record<string, unknown>) => void;

export const HallSprite: FC<{ name: string; x?: number; y?: number; scale?: number; className?: string; style?: CSSProperties; onClick?: (event: MouseEvent) => void }> = ({ name, x = 0, y = 0, scale = 2, className = '', style, onClick }) => {
    const frame = SHEET.frames[name];

    if (!frame) return null;

    const [ sx, sy, w, h ] = frame;

    return (
        <span
            className={`hall-sprite ${className}`}
            onClick={onClick}
            style={{
                left: x,
                top: y,
                width: w * scale,
                height: h * scale,
                backgroundImage: `url(${spritesImage})`,
                backgroundSize: `${SHEET.width * scale}px ${SHEET.height * scale}px`,
                backgroundPosition: `${-sx * scale}px ${-sy * scale}px`,
                ...style
            }} />
    );
};

const cellAt = (event: MouseEvent<HTMLElement>, origin: [number, number], cell: number, columns: number, rows: number): [number, number] | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = rect.width / event.currentTarget.offsetWidth;
    const x = Math.floor(((event.clientX - rect.left) / scale - origin[0]) / cell);
    const y = Math.floor(((event.clientY - rect.top) / scale - origin[1]) / cell);

    return x < 0 || y < 0 || x >= columns || y >= rows ? null : [ x, y ];
};

// ---- Tic-tac-toe: five in a row on 24 x 23

export const TicTacToeBoard: FC<{ board: IHallBoard; myTurn: boolean; play: Play }> = ({ board, myTurn, play }) => {
    const cells = String(board.board ?? '');
    const columns = Number(board.columns ?? 24);
    const line = new Set((board.line as number[]) ?? []);
    const last = Number(board.lastY) * columns + Number(board.lastX);

    return (
        <div className={`hall-board hall-ttt ${myTurn ? 'is-my-turn' : ''}`} style={{ backgroundImage: `url(${tictactoeBoard})` }}
            onClick={(event) => {
                const cell = cellAt(event, [ 0, 0 ], 20, columns, Number(board.rows ?? 23));

                if (cell && myTurn && cells[cell[1] * columns + cell[0]] === '.') play({ x: cell[0], y: cell[1] });
            }}>
            {[ ...cells ].map((mark, index) => (mark === '.' ? null : (
                <HallSprite key={index} name={mark === 'X' ? 'TicTacToe.X' : 'TicTacToe.O'} x={(index % columns) * 20 + 2} y={Math.floor(index / columns) * 20 + 2}
                    className={`${line.has(index) ? 'is-line' : ''} ${index === last ? 'is-last' : ''}`} />
            )))}
        </div>
    );
};

// ---- Four in a row: 7 x 6

export const ConnectFourBoard: FC<{ board: IHallBoard; myTurn: boolean; play: Play }> = ({ board, myTurn, play }) => {
    const cells = String(board.board ?? '');
    const line = new Set((board.line as number[]) ?? []);
    const [ hover, setHover ] = useState(-1);
    const last = Number(board.lastY) * 7 + Number(board.lastX);

    return (
        <div className={`hall-board hall-c4 ${myTurn ? 'is-my-turn' : ''}`}
            onMouseLeave={() => setHover(-1)}
            onMouseMove={(event) => setHover(cellAt(event, [ 16, 16 ], 80, 7, 6)?.[0] ?? -1)}
            onClick={(event) => {
                const cell = cellAt(event, [ 16, 16 ], 80, 7, 6);

                if (cell && myTurn && cells[cell[0]] === '.') play({ x: cell[0] });
            }}>
            {[ ...cells ].map((disc, index) => (disc === '.' ? null : (
                <HallSprite key={index === last ? `last-${board.moves}` : index} name={disc === 'R' ? 'c4_red' : 'c4_yellow'}
                    x={16 + (index % 7) * 80 + 6} y={16 + Math.floor(index / 7) * 80 + 6}
                    className={`${index === last ? 'is-dropped' : ''} ${line.has(index) ? 'is-line' : ''}`}
                    style={{ '--hall-drop': `${-(Math.floor(index / 7) + 1) * 80 - 20}px` } as CSSProperties} />
            )))}
            <img className="hall-c4__frame" src={connect4Board} alt="" draggable={false} />
            {myTurn && hover >= 0 && cells[hover] === '.' && <span className="hall-c4__arrow" style={{ left: 16 + hover * 80 + 26 }} />}
        </div>
    );
};

// ---- Battleships: 13 x 13, a cell of 19 px from (7, 5)

interface IShip { x: number; y: number; length: number; vertical: boolean; sunk?: boolean }

const SEA_ORIGIN: [number, number] = [ 7, 5 ];
const SEA_CELL = 19;

const fleetFits = (ships: IShip[]): boolean => {
    const taken = new Map<number, number>();

    for (let index = 0; index < ships.length; index++) {
        const ship = ships[index];

        for (let i = 0; i < ship.length; i++) {
            const x = ship.x + (ship.vertical ? 0 : i);
            const y = ship.y + (ship.vertical ? i : 0);

            if (x < 0 || y < 0 || x >= 13 || y >= 13) return false;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const other = taken.get((y + dy) * 13 + x + dx);

                    if (other !== undefined && other !== index) return false;
                }
            }

            taken.set(y * 13 + x, index);
        }
    }

    return true;
};

const Sea: FC<{ sea: { shots: string; ships: IShip[] }; scale: number; onCell?: (x: number, y: number) => void; preview?: IShip | null; extra?: IShip[]; last?: number; className?: string; onHover?: (cell: [number, number] | null) => void }> = ({ sea, scale, onCell, preview, extra = [], last = -1, className = '', onHover }) => {
    const at = (cell: number) => SEA_CELL * cell * scale;

    return (
        <div className={`hall-sea ${className}`} style={{ width: 262 * scale, height: 264 * scale, backgroundImage: `url(${battleshipsBoard})`, backgroundSize: `${262 * scale}px ${264 * scale}px` }}
            onMouseMove={(event) => onHover?.(cellAt(event, [ SEA_ORIGIN[0] * scale, SEA_ORIGIN[1] * scale ], SEA_CELL * scale, 13, 13))}
            onMouseLeave={() => onHover?.(null)}
            onClick={(event) => {
                const cell = cellAt(event, [ SEA_ORIGIN[0] * scale, SEA_ORIGIN[1] * scale ], SEA_CELL * scale, 13, 13);

                if (cell && onCell) onCell(cell[0], cell[1]);
            }}>
            {[ ...sea.ships, ...extra ].map((ship, index) => (
                <HallSprite key={`s${index}`} name={`bs_ship_${ship.length}_${ship.vertical ? 'v' : 'h'}`} scale={scale}
                    x={SEA_ORIGIN[0] * scale + at(ship.x) + scale} y={SEA_ORIGIN[1] * scale + at(ship.y) + scale} className={ship.sunk ? 'is-sunk' : ''} />
            ))}
            {preview && <HallSprite name={`bs_ship_${preview.length}_${preview.vertical ? 'v' : 'h'}`} scale={scale} x={SEA_ORIGIN[0] * scale + at(preview.x) + scale} y={SEA_ORIGIN[1] * scale + at(preview.y) + scale} className={`is-preview ${fleetFits([ ...extra, preview ]) ? '' : 'is-bad'}`} />}
            {[ ...sea.shots ].map((shot, index) => (shot === '.' ? null : (
                <HallSprite key={index} name={shot === 'o' ? 'bs_miss' : shot === '#' ? 'bs_sink' : 'bs_hit'} scale={scale}
                    x={SEA_ORIGIN[0] * scale + at(index % 13)} y={SEA_ORIGIN[1] * scale + at(Math.floor(index / 13))} className={index === last ? 'is-last' : ''} />
            )))}
        </div>
    );
};

export const BattleshipsBoard: FC<{ board: IHallBoard; you: number; myTurn: boolean; play: Play }> = ({ board, you, myTurn, play }) => {
    const seas = (board.seas as { shots: string; ships: IShip[]; ready: boolean; left: number }[]) ?? [];
    const fleet = (board.fleet as number[]) ?? [ 5, 4, 4, 3, 3, 3, 2, 2, 2, 2 ];
    const [ placed, setPlaced ] = useState<IShip[]>([]);
    const [ vertical, setVertical ] = useState(false);
    const [ hover, setHover ] = useState<[number, number] | null>(null);
    const me = Math.max(0, you);
    const them = 1 - me;
    const lastIndex = Number(board.lastY) * 13 + Number(board.lastX);

    if (board.phase === 'placing') {
        const ready = seas[me]?.ready;
        const left = [ ...fleet ];

        for (const ship of placed) left.splice(left.indexOf(ship.length), 1);

        const next = left[0];
        const preview = !ready && next && hover ? { x: hover[0], y: hover[1], length: next, vertical } : null;

        return (
            <div className="hall-bs-place">
                <Sea sea={{ shots: '', ships: ready ? seas[me].ships : [] }} scale={2} extra={ready ? [] : placed} preview={preview} onHover={setHover}
                    onCell={(x, y) => {
                        if (ready || !next) return;

                        const ship = { x, y, length: next, vertical };

                        if (fleetFits([ ...placed, ship ])) setPlaced([ ...placed, ship ]);
                    }} />
                <div className="hall-bs-place__side" data-browser-text>
                    {ready
                        ? <strong>{hallt('bs.waiting', 'Your fleet is ready. Waiting for the other captain...')}</strong>
                        : (
                            <>
                                <strong>{hallt('bs.place', 'Place your fleet')}</strong>
                                <span>{next ? hallt('bs.next', 'Next ship: %n% cells. Click the sea to place it; ships may not touch.', [ 'n' ], [ String(next) ]) : hallt('bs.done', 'All your ships are at sea!')}</span>
                                <div className="hall-bs-place__ships">{left.map((length, index) => <HallSprite key={index} name={`bs_ship_${length}_h`} scale={1} className="is-static" />)}</div>
                                <Button variant="secondary" onClick={() => setVertical((value) => !value)}>{vertical ? hallt('bs.vertical', 'Upright') : hallt('bs.horizontal', 'Lying')}</Button>
                                <Button variant="secondary" disabled={!placed.length} onClick={() => setPlaced(placed.slice(0, -1))}>{hallt('bs.undo', 'Take back')}</Button>
                                <Button variant="secondary" onClick={() => play({ random: true })}>{hallt('bs.random', 'Place at random')}</Button>
                                <Button variant="success" disabled={!!next} onClick={() => play({ ships: placed })}>{hallt('bs.ready', 'Ready!')}</Button>
                            </>
                        )}
                </div>
            </div>
        );
    }

    const result = String(board.lastResult ?? '');

    return (
        <div className="hall-bs">
            <div className="hall-bs__column">
                <span className="hall-bs__title" data-browser-text>{hallt('bs.their_sea', 'Their sea: %n% ships left', [ 'n' ], [ String(seas[them]?.left ?? 0) ])}</span>
                <Sea sea={seas[them] ?? { shots: '', ships: [] }} scale={2} className={myTurn ? 'is-target' : ''} last={Number(board.lastSeat) === me ? lastIndex : -1}
                    onCell={(x, y) => {
                        if (myTurn && seas[them]?.shots[y * 13 + x] === '.') play({ x, y });
                    }} />
            </div>
            <div className="hall-bs__column">
                <span className="hall-bs__title" data-browser-text>{hallt('bs.your_sea', 'Your fleet: %n% ships left', [ 'n' ], [ String(seas[me]?.left ?? 0) ])}</span>
                <Sea sea={seas[me] ?? { shots: '', ships: [] }} scale={1} last={Number(board.lastSeat) === them ? lastIndex : -1} />
                {result && <span className={`hall-bs__result is-${result}`} data-browser-text>{hallt(`bs.result.${result}`, result === 'miss' ? 'In the water!' : result === 'sink' ? 'Sunk!' : 'Hit!')}</span>}
            </div>
        </div>
    );
};

// ---- Chess: squares of 27 px; the board turns round for black

const PIECE_SPRITES: Record<string, string> = { k: 'kg', q: 'qu', b: 'cr', n: 'hr', r: 'tw', p: 'sd' };

export const ChessBoard: FC<{ board: IHallBoard; you: number; myTurn: boolean; play: Play }> = ({ board, you, myTurn, play }) => {
    const cells = String(board.board ?? '');
    const legal = useMemo(() => new Set((board.legal as number[]) ?? []), [ board.legal ]);
    const [ selected, setSelected ] = useState(-1);
    const [ promotion, setPromotion ] = useState<[number, number] | null>(null);
    const flipped = you === 1;
    const view = (square: number) => (flipped ? 63 - square : square);
    const taken = (board.taken as string[]) ?? [];

    const click = (square: number) => {
        if (!myTurn) return;

        if (selected >= 0 && legal.has(selected * 64 + square)) {
            const pawn = cells[selected].toLowerCase() === 'p';
            const row = Math.floor(square / 8);

            if (pawn && (row === 0 || row === 7)) {
                setPromotion([ selected, square ]);
                return;
            }

            play({ from: selected, to: square });
            setSelected(-1);
            return;
        }

        const mine = cells[square] !== '.' && (cells[square] === cells[square].toUpperCase()) === (you === 0);

        setSelected(mine ? square : -1);
    };

    return (
        <div className="hall-chess">
            <div className="hall-chess__taken" data-browser-text>{taken.filter((piece) => piece === piece.toLowerCase()).map((piece, index) => <HallSprite key={index} name={`B${PIECE_SPRITES[piece]}`} scale={1} className="is-static" />)}</div>
            <div className={`hall-board hall-chess__board ${flipped ? 'is-flipped' : ''}`} style={{ backgroundImage: `url(${chessBoard})` }}>
                <img className="hall-chess__grid" src={chessGrid} alt="" draggable={false} />
                {Array.from({ length: 64 }, (_, square) => {
                    const piece = cells[square];
                    const at = view(square);
                    const x = (at % 8) * 54;
                    const y = Math.floor(at / 8) * 54;
                    const target = selected >= 0 && legal.has(selected * 64 + square);
                    const classes = [ 'hall-chess__square', square === selected ? 'is-selected' : '', target ? 'is-target' : '', square === board.lastFrom || square === board.lastTo ? 'is-last' : '', board.check && piece === (board.turn === 0 ? 'K' : 'k') ? 'is-check' : '' ].join(' ');
                    const frame = piece !== '.' ? `${piece === piece.toUpperCase() ? 'W' : 'B'}${PIECE_SPRITES[piece.toLowerCase()]}` : '';

                    return (
                        <span key={square} className={classes} style={{ left: x, top: y }} onClick={() => click(square)}>
                            {frame && <HallSprite name={frame} x={27 - (SHEET.frames[frame]?.[2] ?? 19)} y={50 - (SHEET.frames[frame]?.[3] ?? 21) * 2} />}
                        </span>
                    );
                })}
            </div>
            <div className="hall-chess__taken" data-browser-text>{taken.filter((piece) => piece === piece.toUpperCase()).map((piece, index) => <HallSprite key={index} name={`W${PIECE_SPRITES[piece.toLowerCase()]}`} scale={1} className="is-static" />)}</div>
            {promotion && (
                <div className="hall-chess__promotion">
                    <span data-browser-text>{hallt('chess.promote', 'Your pawn becomes:')}</span>
                    {[ 'q', 'r', 'b', 'n' ].map((piece, index) => (
                        <button key={piece} type="button" onClick={() => {
                            play({ from: promotion[0], to: promotion[1], promotion: [ 5, 4, 3, 2 ][index] });
                            setPromotion(null);
                            setSelected(-1);
                        }}>
                            <HallSprite name={`${you === 0 ? 'W' : 'B'}${PIECE_SPRITES[piece]}`} className="is-static" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---- Poker: five cards each, a change, the showdown

const HAND_NAMES = [ 'High card', 'One pair', 'Two pairs', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush', 'Royal flush', 'Five of a kind' ];

export const pokerHandName = (hand: number): string => hallt(`poker.hand.${hand}`, HAND_NAMES[hand] ?? '');

export const PokerBoard: FC<{ board: IHallBoard; table: IHallTable; play: Play }> = ({ board, table, play }) => {
    const hands = (board.hands as { cards: string[]; changed: boolean; changes: number; folded: boolean; hand: number }[]) ?? [];
    const [ picked, setPicked ] = useState<number[]>([]);
    const you = table.you;
    const mine = hands[you];
    const canChange = board.phase === 'change' && mine && !mine.changed && !mine.folded;
    const winners = table.winners ?? [];

    return (
        <div className="hall-poker">
            {hands.map((hand, seat) => {
                const player = table.players[seat];

                if (!player) return null;

                return (
                    <div key={seat} className={`hall-poker__hand ${seat === you ? 'is-you' : ''} ${winners.includes(seat) ? 'is-winner' : ''} ${hand.folded ? 'is-folded' : ''}`}>
                        <span className="hall-poker__name" data-browser-text>
                            <strong>{player.name}</strong>
                            {hand.folded ? hallt('poker.folded', 'left the table') : hand.hand >= 0 && board.phase === 'showdown' ? pokerHandName(hand.hand) : hand.changed ? hallt('poker.changed', 'changed %n% cards', [ 'n' ], [ String(hand.changes) ]) : hallt('poker.thinking', 'is choosing...')}
                        </span>
                        <div className="hall-poker__cards">
                            {hand.cards.map((card, index) => (
                                <span key={index} className={`hall-poker__card ${picked.includes(index) && seat === you && canChange ? 'is-picked' : ''}`}
                                    onClick={() => {
                                        if (seat !== you || !canChange) return;

                                        setPicked(picked.includes(index) ? picked.filter((value) => value !== index) : [ ...picked, index ]);
                                    }}>
                                    <HallSprite name={card ? card : 'BACKSIDE'} scale={seat === you ? 2 : 1} className="is-static" />
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {canChange && (
                <div className="hall-poker__actions" data-browser-text>
                    <span>{hallt('poker.pick', 'Click the cards you want to change, then:')}</span>
                    <Button variant="success" onClick={() => {
                        play({ change: picked });
                        setPicked([]);
                    }}>{picked.length ? hallt('poker.change', 'Change %n% cards', [ 'n' ], [ String(picked.length) ]) : hallt('poker.keep', 'Keep my hand')}</Button>
                </div>
            )}
        </div>
    );
};

// ---- The snail race: a lane a seat (600 x 30, shown 1.2x), the start at 40, the finish at 552

const SNAILS = snailData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number]> };
const LANE_SCALE = 1.2;

const SnailSprite: FC<{ name: string; x: number; y: number; className?: string }> = ({ name, x, y, className = '' }) => {
    const frame = SNAILS.frames[name];

    if (!frame) return null;

    const scale = 2;

    return (
        <span className={`hall-sprite ${className}`} style={{
            left: x,
            top: y,
            width: frame[2] * scale,
            height: frame[3] * scale,
            backgroundImage: `url(${snailImage})`,
            backgroundSize: `${SNAILS.width * scale}px ${SNAILS.height * scale}px`,
            backgroundPosition: `${-frame[0] * scale}px ${-frame[1] * scale}px`
        }} />
    );
};

const PLACES = [ '', '1er', '2e', '3e', '4e', '5e', '6e' ];

export const SnailBoard: FC<{ board: IHallBoard; table: IHallTable; play: Play; tick: number }> = ({ board, table, play, tick }) => {
    const snails = (board.snails as { x: number; speed: number; mood: string; place: number; time: number; cheerIn: number }[]) ?? [];
    const length = Number(board.length ?? 100);
    const startsIn = Number(board.startsIn ?? 0);
    const me = snails[table.you];
    const canCheer = !!me && table.state === 'playing' && !!table.players[table.you]?.waiting;

    return (
        <div className="hall-snails">
            {startsIn > 0 && table.state === 'playing' && <div className="hall-snails__count" data-browser-text>{Math.ceil(startsIn / 1000)}</div>}
            {snails.map((snail, seat) => {
                const left = (40 + (552 - 40) * Math.min(1, snail.x / length)) * LANE_SCALE - 60;
                const frame = snail.mood === 'sleep' ? 2 : snail.mood === 'done' || snail.speed <= 0 ? 1 : tick % 2;

                return (
                    <div key={seat} className={`hall-snails__lane ${seat === table.you ? 'is-you' : ''}`} style={{ backgroundImage: `url(${snailTrack})` }}>
                        <span className="hall-snails__name" data-browser-text>{table.players[seat]?.name ?? ''}</span>
                        <div className="hall-snails__runner" style={{ left }}>
                            {snail.mood === 'turbo' && <SnailSprite name="dust" x={-26} y={22} />}
                            <SnailSprite name={`snail_${seat % 6}_${frame}`} x={0} y={-6} />
                            {snail.mood === 'sleep' && <SnailSprite name="zzz" x={30} y={-28} className="hall-snails__zzz" />}
                            {snail.mood === 'cheered' && <SnailSprite name="leaf" x={54} y={-18} className="hall-snails__leaf" />}
                        </div>
                        {snail.place > 0 && <span className={`hall-snails__place is-${snail.place}`} data-browser-text>{PLACES[snail.place] ?? snail.place}{snail.time > 0 ? ` · ${(snail.time / 1000).toFixed(1)} s` : ''}</span>}
                    </div>
                );
            })}
            {me && table.state === 'playing' && (
                <div className="hall-snails__actions" data-browser-text>
                    <Button variant="success" disabled={!canCheer} onClick={() => play({ cheer: true })}>
                        {canCheer ? hallt('snails.cheer', 'Cheer your snail! (space)') : me.place > 0 ? hallt('snails.arrived', 'Your snail has arrived!') : startsIn > 0 ? hallt('snails.ready', 'Get ready...') : hallt('snails.wait', 'Catching its breath...')}
                    </Button>
                </div>
            )}
        </div>
    );
};
