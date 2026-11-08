import { CSSProperties, FC } from 'react';
import islandData from '../../assets/images/lostmonkey/lm-island.json';
import islandImage from '../../assets/images/lostmonkey/lm-island.png';
import monkeysImage from '../../assets/images/lostmonkey/lm-monkeys.png';

/** The pieces of Lost Monkey's atlases (lostmonkey-classic.py): name to [x, y, w, h] in lm-island.png. */
export const LM_SHEET = islandData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number]> };

/** A piece of the atlases, its bottom middle at (x, y) unless `anchor` says otherwise. */
export const LmSprite: FC<{ name: string; x?: number; y?: number; scale?: number; anchor?: 'bottom' | 'centre' | 'none'; className?: string; style?: CSSProperties; onClick?: () => void; title?: string }> = ({ name, x = 0, y = 0, scale = 1, anchor = 'bottom', className = '', style, onClick, title }) => {
    const frame = LM_SHEET.frames[name];

    if (!frame) return null;

    const [ fx, fy, w, h ] = frame;
    const left = anchor === 'none' ? x : x - (w * scale) / 2;
    const top = anchor === 'bottom' ? y - h * scale : anchor === 'centre' ? y - (h * scale) / 2 : y;

    return (
        <span className={`lm-sprite ${ onClick ? 'is-clickable' : '' } ${ className }`} title={title} onClick={onClick} style={{
            left,
            top,
            width: w * scale,
            height: h * scale,
            backgroundImage: `url(${ islandImage })`,
            backgroundSize: `${ LM_SHEET.width * scale }px ${ LM_SHEET.height * scale }px`,
            backgroundPosition: `${ -fx * scale }px ${ -fy * scale }px`,
            ...style
        }} />
    );
};

/** The size of a monkey in lm-monkeys.png: nine colours awake (cells 0 to 8), then asleep (9 to 17), four a row. */
export const MONKEY_W = 127;
export const MONKEY_H = 173;

export const MonkeyPicture: FC<{ colour: number; asleep?: boolean; scale?: number; className?: string; style?: CSSProperties; onClick?: () => void }> = ({ colour, asleep = false, scale = 1, className = '', style, onClick }) => {
    const cell = (asleep ? 9 : 0) + (((colour % 9) + 9) % 9);

    return (
        <span className={`lm-monkey-picture ${ className }`} onClick={onClick} style={{
            width: MONKEY_W * scale,
            height: MONKEY_H * scale,
            backgroundImage: `url(${ monkeysImage })`,
            backgroundSize: `${ 4 * MONKEY_W * scale }px ${ 5 * MONKEY_H * scale }px`,
            backgroundPosition: `${ -(cell % 4) * MONKEY_W * scale }px ${ -Math.floor(cell / 4) * MONKEY_H * scale }px`,
            ...style
        }} />
    );
};
