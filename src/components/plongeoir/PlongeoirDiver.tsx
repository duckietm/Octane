import { FC, useEffect, useMemo, useRef } from 'react';
import { GetAvatarRenderManager } from '@octane/renderer';
import { IHallPlayer } from '../../api';
import spriteData from '../../assets/images/plongeoir/pl-sprites.json';
import spriteImage from '../../assets/images/plongeoir/pl-sprites.png';
import { DIVER_PARTS, DiverPart, IDiver, partMember } from './PlongeoirEngine';

export const SHEET = spriteData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number, number, number]> };

let sheetImage: HTMLImageElement | null = null;

const sheet = (onLoad: () => void): HTMLImageElement => {
    if (!sheetImage) {
        sheetImage = new Image();
        sheetImage.src = spriteImage;
    }

    if (!sheetImage.complete) sheetImage.addEventListener('load', onLoad, { once: true });

    return sheetImage;
};

/** The old small hairs the diver may wear (the Lido's diver had the look's hair in the old figure system). */
const HAIRS_M = [ '002', '003', '006', '010', '011', '013', '015', '016', '017', '018', '019', '021', '022' ];
const HAIRS_F = [ '501', '502', '503', '504', '505', '506', '507', '508', '509' ];
const SKIN = '#ffcb98';
const SWIMSUITS = [ '#e73929', '#217bef', '#ffce21', '#8ce700', '#a14ec9', '#ff8a1e', '#20b2aa', '#ff69b4' ];

export interface IDiverLook {
    models: Record<DiverPart, string>;
    colours: Record<DiverPart, string>;
}

const partOf = (figure: string, type: string): [number, number] | null => {
    for (const part of (figure ?? '').split('.')) {
        const [ name, set, colour ] = part.split('-');

        if (name === type) return [ Number(set), Number(colour ?? 0) ];
    }

    return null;
};

const hex = (value: number): string => `#${ (value & 0xffffff).toString(16).padStart(6, '0') }`;

/** A colour of the look, from the hotel's figure data (the part's palette). */
const colourOf = (figure: string, type: string, fallback: string): string => {
    const part = partOf(figure, type);

    if (!part) return fallback;

    try {
        const data = GetAvatarRenderManager()?.structureData;
        const setType = data?.getSetType(type);
        const colour = setType ? data.getPalette(setType.paletteID)?.getColor(part[1]) : null;

        return colour ? hex(colour.rgb) : fallback;
    } catch {
        return fallback;
    }
};

/**
 * The diver's look for a player: the swimsuit of their sex (the Lido gave girls s01, boys s02), their skin, hair and
 * top colours, and an old hair close to theirs.
 */
export const diverLook = (player: IHallPlayer, seat: number): IDiverLook => {
    const female = (player.gender ?? '').toUpperCase() === 'F';
    const hairs = female ? HAIRS_F : HAIRS_M;
    const hairSet = partOf(player.figure, 'hr')?.[0] ?? player.userId;
    const skin = colourOf(player.figure, 'hd', SKIN);

    return {
        models: { bd: 's01', lh: 's01', rh: 's01', ch: female ? 's01' : 's02', hd: '001', fc: '001', hr: hairs[Math.abs(hairSet) % hairs.length] },
        colours: {
            bd: skin,
            lh: skin,
            rh: skin,
            hd: skin,
            fc: skin,
            hr: colourOf(player.figure, 'hr', '#7a4a1e'),
            ch: colourOf(player.figure, 'ch', SWIMSUITS[seat % SWIMSUITS.length])
        }
    };
};

/** A part tinted as Director's darken ink did: the white picture multiplied by the colour. */
const drawTinted = (context: CanvasRenderingContext2D, scratch: HTMLCanvasElement, image: HTMLImageElement, name: string, colour: string) => {
    const frame = SHEET.frames[name];

    if (!frame) return;

    const [ x, y, w, h, rx, ry ] = frame;
    const left = -rx + 10;
    const top = 60 - ry - 8;
    const work = scratch.getContext('2d');

    scratch.width = w;
    scratch.height = h;
    work.clearRect(0, 0, w, h);
    work.drawImage(image, x, y, w, h, 0, 0, w, h);
    work.globalCompositeOperation = 'multiply';
    work.fillStyle = colour;
    work.fillRect(0, 0, w, h);
    work.globalCompositeOperation = 'destination-in';
    work.drawImage(image, x, y, w, h, 0, 0, w, h);
    work.globalCompositeOperation = 'source-over';
    context.drawImage(scratch, left, top);
};

/**
 * The diver (60 x 60, its point at the middle), drawn as UpdatePelle drew it and turned as the sprite was: facing
 * left going up (flipH), upside down going down (flipV). `left` and `top` are in stage pixels (x2).
 */
export const PlongeoirDiver: FC<{ diver: IDiver; look: IDiverLook; zoom?: number }> = ({ diver, look, zoom = 2 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scratch = useMemo(() => document.createElement('canvas'), []);
    const key = `${ diver.action }-${ diver.frame }-${ diver.direction }`;

    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;

            if (!canvas) return;

            const image = sheet(draw);

            if (!image.complete) return;

            const context = canvas.getContext('2d');

            context.clearRect(0, 0, 60, 60);

            for (const part of DIVER_PARTS) {
                const name = partMember(diver, part, look.models).find((candidate) => SHEET.frames[candidate]);

                if (name) drawTinted(context, scratch, image, name, look.colours[part]);
            }
        };

        draw();
    }, [ key, look ]);

    const flipH = diver.direction === 'u';
    const flipV = diver.direction === 'd';

    return (
        <canvas ref={canvasRef} className="plongeoir-diver" width={60} height={60}
            style={{ left: (diver.h - 30) * zoom, top: (diver.v - 30) * zoom, width: 60 * zoom, height: 60 * zoom, transform: `scale(${ flipH ? -1 : 1 }, ${ flipV ? -1 : 1 })` }} />
    );
};

/** A picture of the sprite sheet at its regpoint, in stage pixels (x2). */
export const PlongeoirSprite: FC<{ name: string; x: number; y: number; zoom?: number; className?: string; opacity?: number }> = ({ name, x, y, zoom = 2, className = '', opacity = 1 }) => {
    const frame = SHEET.frames[name];

    if (!frame) return null;

    const [ fx, fy, w, h, rx, ry ] = frame;

    return (
        <span className={`plongeoir-sprite ${ className }`} style={{
            left: (x - rx) * zoom,
            top: (y - ry) * zoom,
            width: w * zoom,
            height: h * zoom,
            opacity,
            backgroundImage: `url(${ spriteImage })`,
            backgroundSize: `${ SHEET.width * zoom }px ${ SHEET.height * zoom }px`,
            backgroundPosition: `${ -fx * zoom }px ${ -fy * zoom }px`
        }} />
    );
};
