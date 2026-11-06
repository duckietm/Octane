import { GetRoomEngine, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager, IUnoSeat, IUnoTable, ut } from '../../api';
import { LayoutFurniImageView } from '../../common';
import roomImage from '../../assets/images/uno/uno-room.png';
import { UnoCardView } from './UnoCardView';
import { useUnoAvatar } from './useUnoAvatar';

/**
 * Habbi's UNO room, drawn as the hotel draws a room: the room picture (uno-room.png, deploy/scripts/uno-room.py),
 * the hotel's own furni (a table, eight chairs, plants) drawn by its renderer, and the players sitting on the chairs.
 * Tile (x, y) has its top corner at ROOM_ORIGIN + (32 * (x - y), 16 * (x + y)).
 */
export const ROOM_WIDTH = 664;
export const ROOM_HEIGHT = 472;
const ROOM_ORIGIN = { x: 332, y: 132 };

/** The eight chairs round the table, as the server numbers them; `dir` is where the sitter looks. */
export const UNO_CHAIRS = [
    { x: 4, y: 6, dir: 0 },
    { x: 5, y: 6, dir: 0 },
    { x: 6, y: 5, dir: 6 },
    { x: 6, y: 4, dir: 6 },
    { x: 5, y: 3, dir: 4 },
    { x: 4, y: 3, dir: 4 },
    { x: 3, y: 4, dir: 2 },
    { x: 3, y: 5, dir: 2 }
];

const TABLE = { name: 'table_plasto_bigsquare', x: 4, y: 4, size: 2 };
const CHAIR = 'chair_plasto';
const DECOR = [
    { name: 'plant_yukka', x: 0, y: 0, dir: 2 },
    { name: 'lamp2_armas', x: 9, y: 0, dir: 4 },
    { name: 'plant_big_cactus', x: 0, y: 9, dir: 2 },
    { name: 'plant_pineapple', x: 9, y: 9, dir: 2 }
];

/** The middle of the table top, where the deck and the pile lie. */
const TABLE_TOP_LIFT = 30;
/** A seated avatar: the middle of its tile, lifted to the seat. */
const SIT_LIFT = 10;
const FEET_FROM_BOTTOM = 14;

export const tilePoint = (x: number, y: number) => ({ left: ROOM_ORIGIN.x + 32 * (x - y), top: ROOM_ORIGIN.y + 16 * (x + y) });

/** Furni drawn by the hotel's renderer; an image asked for while the type still loads is asked again once it is in. */
const useFurniLoads = (names: string[]): number => {
    const [loads, setLoads] = useState(0);

    useEffect(() => {
        const engine = GetRoomEngine?.();
        const session = GetSessionDataManager();
        let active = true;
        const listener = { imageReady: () => active && setLoads((count) => count + 1), imageFailed: () => active && setLoads((count) => count + 1) };

        for (const name of names) {
            const id = session?.getFloorItemDataByName?.(name)?.id;

            try {
                if (engine && id !== undefined) engine.getFurnitureFloorImage(id, new Vector3d(0), 64, listener, 0, '', -1);
            } catch {
                // The renderer is not ready: the furni ask for themselves.
            }
        }

        return () => {
            active = false;
        };
    }, [names]);

    return loads;
};

const Furni: FC<{ name: string; x: number; y: number; dir: number; size?: number; depth: number; loads: number }> = ({ name, x, y, dir, size = 1, depth, loads }) => {
    const id = GetSessionDataManager()?.getFloorItemDataByName?.(name)?.id;
    const bottom = tilePoint(x + size, y + size);

    if (id === undefined) return null;

    return (
        <div className="uno-scene__item" style={{ left: bottom.left, top: bottom.top, zIndex: depth }}>
            <LayoutFurniImageView key={`${name}-${loads}`} productType="s" productClassId={id} direction={dir * 45} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
        </div>
    );
};

const Player: FC<{ seat: IUnoSeat; table: IUnoTable; bubble: string | null; userId: number }> = ({ seat, table, bubble, userId }) => {
    const chair = UNO_CHAIRS[seat.chair] ?? UNO_CHAIRS[0];
    const picture = useUnoAvatar(seat.figure, seat.gender, chair.dir);
    const centre = tilePoint(chair.x + 0.5, chair.y + 0.5);
    const depth = (chair.x + chair.y) * 10 + 6;
    const style: CSSProperties = { left: centre.left, top: centre.top + FEET_FROM_BOTTOM - SIT_LIFT, zIndex: depth };
    const playing = table.state === 'playing';

    return (
        <>
            {picture && <img className="uno-scene__avatar" src={picture} alt="" style={style} draggable={false} />}
            <div className={`uno-scene__tag ${seat.turn ? 'is-turn' : ''} ${seat.userId === userId ? 'is-you' : ''}`} style={{ left: centre.left, top: centre.top - 84, zIndex: 900 }}>
                {seat.turn && <span className="uno-scene__arrow" />}
                <span className="uno-scene__name">{seat.name}</span>
                {playing && (
                    <span className="uno-scene__count">
                        <UnoCardView back zoom={0.5} />
                        <span>{seat.cards}</span>
                    </span>
                )}
            </div>
            {bubble && (
                <div className="uno-bubble" style={{ left: centre.left, top: centre.top - 100, zIndex: 950 }}>
                    <strong>{seat.name}:</strong> {bubble}
                </div>
            )}
        </>
    );
};

/**
 * The scene: the room, the table with the deck and the pile, the chairs (a free one is clicked to sit on it while the
 * table waits), the players sitting with their name, their number of cards and what they say.
 */
export const UnoRoomScene: FC<{
    table: IUnoTable | null;
    userId: number;
    bubbles: Map<string, string>;
    onChair: (chair: number) => void;
    /** The room's zoom: names and bubbles stay at the hotel's text size. */
    zoom?: number;
}> = ({ table, userId, bubbles, onChair, zoom = 1 }) => {
    const names = useMemo(() => [ TABLE.name, CHAIR, ...DECOR.map((item) => item.name) ], []);
    const loads = useFurniLoads(names);
    const taken = new Map<number, IUnoSeat>((table?.seats ?? []).map((seat) => [ seat.chair, seat ]));
    const waiting = !table || table.state !== 'playing';
    const tableTop = tilePoint(TABLE.x + 1, TABLE.y + 1);
    const showCards = table && table.state !== 'waiting' && !!table.top;

    return (
        <div className="uno-scene" style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT, '--uno-unzoom': String(1 / zoom) } as CSSProperties}>
            <img className="uno-scene__room" src={roomImage} alt="" width={ROOM_WIDTH} height={ROOM_HEIGHT} draggable={false} />

            {DECOR.map((item) => <Furni key={item.name} {...item} depth={(item.x + item.y) * 10} loads={loads} />)}

            <Furni name={TABLE.name} x={TABLE.x} y={TABLE.y} dir={0} size={TABLE.size} depth={(TABLE.x + TABLE.y) * 10 + 5} loads={loads} />

            {UNO_CHAIRS.map((chair, index) => {
                const seat = taken.get(index);
                const free = !seat && waiting && !!table;
                const centre = tilePoint(chair.x + 0.5, chair.y + 0.5);

                return (
                    <div key={index}>
                        <Furni name={CHAIR} x={chair.x} y={chair.y} dir={chair.dir} depth={(chair.x + chair.y) * 10 + 2} loads={loads} />
                        {free && (
                            <button type="button" className="uno-scene__seat" style={{ left: centre.left, top: centre.top, zIndex: 800 }} onClick={() => onChair(index)} aria-label={ut('sit', 'Sit here')}>
                                <span>{ut('sit', 'Sit here')}</span>
                            </button>
                        )}
                    </div>
                );
            })}

            {showCards && (
                <div className="uno-scene__pile" style={{ left: tableTop.left, top: tableTop.top - TABLE_TOP_LIFT, zIndex: (TABLE.x + TABLE.y) * 10 + 7 }}>
                    <UnoCardView back zoom={1} className="uno-scene__deck" />
                    <UnoCardView code={table.top} zoom={1} />
                </div>
            )}

            {table?.seats.map((seat) => <Player key={seat.userId} seat={seat} table={table} bubble={bubbles.get(seat.name) ?? null} userId={userId} />)}
        </div>
    );
};
