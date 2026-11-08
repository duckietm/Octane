import { AvatarAction } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import kartsData from '../../assets/images/kart/kart-karts.json';
import kartsImage from '../../assets/images/kart/kart-karts.png';
import itemsImage from '../../assets/images/kart/kart-items.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';

/** The karts' names are texts (`kart.kart.<n>`): the hotel names them. */
/** The karts (kart-sprites.py): rows of karts, columns of direction x layer (behind, in front of the driver). */
const SHEET = kartsData as unknown as { cell: [number, number]; anchor: [number, number]; seats: [number, number][] };

export const KARTS = [
    { name: 'Ruby', colour: '#e5352b' },
    { name: 'Emerald', colour: '#3aa64a' },
    { name: 'Candy', colour: '#ef8bbb' },
    { name: 'Azure', colour: '#3b6ee0' },
    { name: 'Lemon', colour: '#e7b81b' }
];

export const kartName = (kart: number): string => localizeWithFallback(`kart.kart.${ kart }`, KARTS[kart % KARTS.length].name);

/** The hotel's direction (0 to 7) of a heading on the screen (0: right, PI / 2: down). */
export const directionOf = (angle: number): number => (((Math.round(angle / (Math.PI / 4)) + 1) % 8) + 8) % 8;

/** How far up the driver sits above the kart's seat point, by direction (the sitting avatar's picture). */
const DRIVER_LIFT = 14;

const Layer: FC<{ kart: number; direction: number; layer: number; scale: number }> = ({ kart, direction, layer, scale }) => {
    const [ w, h ] = SHEET.cell;

    return (
        <span className="kart-layer" style={{
            width: w * scale,
            height: h * scale,
            left: -SHEET.anchor[0] * scale,
            top: -SHEET.anchor[1] * scale,
            backgroundImage: `url(${ kartsImage })`,
            backgroundSize: `${ w * 16 * scale }px ${ h * KARTS.length * scale }px`,
            backgroundPosition: `${ -(direction * 2 + layer) * w * scale }px ${ -(kart % KARTS.length) * h * scale }px`
        }} />
    );
};

/** A driver (the avatar's picture, sitting) in a kart, the kart's ground point at (0, 0) of the element. */
export const KartDrawing: FC<{ kart: number; direction: number; driver: string | null; scale?: number; className?: string; style?: CSSProperties }> = ({ kart, direction, driver, scale = 1, className = '', style }) => {
    const [ seatX, seatY ] = SHEET.seats[direction] ?? SHEET.anchor;

    return (
        <span className={`kart-driver ${ className }`} style={style}>
            <Layer kart={kart} direction={direction} layer={0} scale={scale} />
            {driver && <img className="kart-driver__avatar" src={driver} alt="" draggable={false} style={{ left: (seatX - SHEET.anchor[0]) * scale, top: (seatY - SHEET.anchor[1] + DRIVER_LIFT) * scale, transform: `translate(-50%, -100%) scale(${ scale })`, transformOrigin: '50% 100%' }} />}
            <Layer kart={kart} direction={direction} layer={1} scale={scale} />
        </span>
    );
};

/** A player in a kart facing one direction (the kart choice). */
export const KartPicture: FC<{ kart: number; direction: number; figure: string; gender: string; scale?: number }> = ({ kart, direction, figure, gender, scale = 1 }) => {
    const driver = useUnoAvatar(figure, gender, direction, AvatarAction.POSTURE_SIT);

    return <KartDrawing kart={kart} direction={direction} driver={driver} scale={scale} />;
};

/** A racer: the driver drawn once in each of the eight directions, the kart turned to its heading (or spinning). */
export const KartRacer: FC<{ kart: number; angle: number; figure: string; gender: string; spinning?: boolean }> = ({ kart, angle, figure, gender, spinning = false }) => {
    const drivers = [
        useUnoAvatar(figure, gender, 0, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 1, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 2, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 3, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 4, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 5, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 6, AvatarAction.POSTURE_SIT),
        useUnoAvatar(figure, gender, 7, AvatarAction.POSTURE_SIT)
    ];
    const direction = spinning ? Math.floor(performance.now() / 90) % 8 : directionOf(angle);

    return <KartDrawing kart={kart} direction={direction} driver={drivers[direction]} />;
};

export const ITEM_INDEX: Record<string, number> = { box: 0, boost: 1, banana: 2, shell: 3 };

export const KartItem: FC<{ name: string; size?: number; className?: string; style?: CSSProperties }> = ({ name, size = 40, className = '', style }) => (
    <span className={`kart-item-icon ${ className }`} style={{
        width: size,
        height: size,
        backgroundImage: `url(${ itemsImage })`,
        backgroundSize: `${ 4 * size }px ${ size }px`,
        backgroundPosition: `${ -(ITEM_INDEX[name] ?? 0) * size }px 0`,
        ...style
    }} />
);
