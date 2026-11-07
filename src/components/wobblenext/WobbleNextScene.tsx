import { AvatarAction, GetRoomEngine, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager, IWobbleFighter, IWobbleMatch, WOBBLE_FALL } from '../../api';
import { LayoutFurniImageView } from '../../common';
import poolImage from '../../assets/images/wobblenext/wobble-pool.png';
import splashImage from '../../assets/images/wobblenext/wobble-splash.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';

/**
 * The rooftop pool, drawn as the hotel draws a room: the picture (wobble-pool.png, deploy/scripts/wobble-art.py), the
 * hotel's own Lido furni round it, drawn by its renderer, and the two fighters on the beam. Tile (x, y) has its top
 * corner at ORIGIN + (32 * (x - y), 16 * (x + y)); the beam is a level line at BEAM_Y, its 8 places 64 pixels apart.
 */
export const POOL_WIDTH = 912;
export const POOL_HEIGHT = 682;
/** The sky above the floor: it may go off the top of the screen. */
export const POOL_BACKDROP = 170;
const ORIGIN = { x: 456, y: 210 };
const BEAM_LEFT = 200;
const BEAM_Y = 434;
const PLACE = 64;
/** How far the water lies under the beam, where the fallen swim. */
const WATER_BELOW = 64;
/** A fighter tilts this many degrees per point of balance. */
const TILT = 0.42;
const FEET_FROM_BOTTOM = 12;

const DECOR: { name: string; x: number; y: number; dir: number; lift?: number }[] = [
    { name: 'lm_palm1', x: 1, y: 1, dir: 2 },
    { name: 'bw_shower', x: 3, y: 0, dir: 4 },
    { name: 'lido_chair', x: 5, y: 1, dir: 4 },
    { name: 'lido_parasol', x: 6, y: 1, dir: 2 },
    { name: 'lido_chair', x: 7, y: 1, dir: 4 },
    { name: 'lido_chair', x: 9, y: 1, dir: 4 },
    { name: 'lido_parasol', x: 10, y: 1, dir: 2 },
    { name: 'bolly_palm', x: 12, y: 1, dir: 2 },
    { name: 'pink_flamingo', x: 13, y: 8, dir: 6 },
    { name: 'habbo25_c25_lifeguardchair2', x: 1, y: 6, dir: 2 },
    { name: 'lido_bench', x: 1, y: 9, dir: 2 },
    { name: 'bolly_palm', x: 1, y: 12, dir: 2 },
    { name: 'bw_bball', x: 9, y: 12, dir: 2 },
    { name: 'summer_c22_lifering', x: 12, y: 9, dir: 6 },
    { name: 'habbo25_c25_duckfloat1', x: 10, y: 9, dir: 4, lift: -18 }
];

export const poolTile = (x: number, y: number) => ({ left: ORIGIN.x + 32 * (x - y), top: ORIGIN.y + 16 * (x + y) });

export const beamPlace = (pos: number) => BEAM_LEFT + PLACE / 2 + PLACE * pos;

const useFurniLoads = (names: string[]): number => {
    const [loads, setLoads] = useState(0);

    useEffect(() => {
        const engine = GetRoomEngine?.();
        const session = GetSessionDataManager();
        let active = true;
        const loaded = () => active && setLoads((count) => count + 1);
        const listener = { imageReady: loaded, imageFailed: loaded };

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

const Furni: FC<{ name: string; x: number; y: number; dir: number; lift?: number; loads: number }> = ({ name, x, y, dir, lift = 0, loads }) => {
    const id = GetSessionDataManager()?.getFloorItemDataByName?.(name)?.id;
    const bottom = poolTile(x + 1, y + 1);

    if (id === undefined) return null;

    return (
        <div className="wbn-scene__item" style={{ left: bottom.left, top: bottom.top - lift, zIndex: (x + y) * 10 }}>
            <LayoutFurniImageView key={`${name}-${loads}`} productType="s" productClassId={id} direction={dir * 45} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
        </div>
    );
};

/**
 * A fighter on the beam, tilted by their balance, pushing, hit, crouching; once fallen, swimming under the beam with a
 * splash. The left fighter looks right (direction 1), the right one looks left (direction 5).
 */
const Fighter: FC<{ fighter: IWobbleFighter; showFall: boolean }> = ({ fighter, showFall }) => {
    const standing = useUnoAvatar(fighter.figure, fighter.gender, fighter.side === 0 ? 1 : 5, AvatarAction.POSTURE_STAND);
    const swimming = useUnoAvatar(fighter.figure, fighter.gender, fighter.side === 0 ? 2 : 4, AvatarAction.POSTURE_STAND);
    const x = beamPlace(fighter.pos);
    const toward = fighter.side === 0 ? 1 : -1;
    const recent = fighter.actionAgo >= 0 && fighter.actionAgo < 380;
    const tilt = Math.max(-WOBBLE_FALL, Math.min(WOBBLE_FALL, fighter.balance)) * TILT;
    const classes = [
        'wbn-fighter',
        recent && fighter.action === 'push' ? 'is-pushing' : '',
        recent && fighter.action === 'miss' ? 'is-lunging' : '',
        recent && fighter.action === 'hit' ? 'is-hit' : '',
        fighter.stabilising ? 'is-crouching' : '',
        fighter.fell && showFall ? 'is-fallen' : ''
    ].join(' ');

    return (
        <>
            <div className={classes} style={{ left: x, top: BEAM_Y - 6, zIndex: 300, '--wbn-toward': toward, '--wbn-fall': Math.sign(fighter.balance) || toward } as CSSProperties}>
                <div className="wbn-fighter__tilt" style={{ transform: `rotate(${tilt}deg)` }}>
                    <div className="wbn-fighter__body">
                        {standing && <img className="wbn-fighter__avatar" src={standing} alt="" draggable={false} style={{ marginBottom: -FEET_FROM_BOTTOM }} />}
                    </div>
                </div>
            </div>
            {fighter.fell && showFall && (
                <>
                    <div className="wbn-splash" style={{ left: x + Math.sign(fighter.balance) * 24, top: BEAM_Y + WATER_BELOW, zIndex: 310, backgroundImage: `url(${splashImage})` }} />
                    {swimming && (
                        <div className="wbn-swimmer" style={{ left: x + Math.sign(fighter.balance) * 24, top: BEAM_Y + WATER_BELOW + 6, zIndex: 305 }}>
                            <img src={swimming} alt="" draggable={false} />
                        </div>
                    )}
                </>
            )}
        </>
    );
};

const NameTag: FC<{ fighter: IWobbleFighter; match: IWobbleMatch; zoom: number }> = ({ fighter, match, zoom }) => {
    const stars = Array.from({ length: match.rules.roundsToWin }, (_, index) => index < fighter.wins);

    return (
        <div className={`wbn-tag ${fighter.you ? 'is-you' : ''}`} style={{ left: beamPlace(fighter.pos), top: BEAM_Y - 118, zIndex: 900, transform: `translate(-50%, -100%) scale(${1 / zoom})` }}>
            <span className="wbn-tag__name">{fighter.name}</span>
            <span className="wbn-tag__stars">{stars.map((won, index) => <span key={index} className={won ? 'is-won' : ''}>★</span>)}</span>
        </div>
    );
};

export const WobbleNextScene: FC<{ match: IWobbleMatch | null; zoom: number }> = ({ match, zoom }) => {
    const names = useMemo(() => [ ...new Set(DECOR.map((item) => item.name)) ], []);
    const loads = useFurniLoads(names);
    const showFall = match?.state === 'round_over' || match?.state === 'finished';

    return (
        <div className={`wbn-scene ${match?.sudden ? 'is-sudden' : ''}`} style={{ width: POOL_WIDTH, height: POOL_HEIGHT }}>
            <img className="wbn-scene__floor" src={poolImage} alt="" width={POOL_WIDTH} height={POOL_HEIGHT} draggable={false} />
            <div className="wbn-scene__water" />
            {DECOR.map((item, index) => <Furni key={`${item.name}-${index}`} {...item} loads={loads} />)}
            {match?.fighters.map((fighter) => (
                <div key={fighter.userId}>
                    <Fighter fighter={fighter} showFall={showFall} />
                    {!(fighter.fell && showFall) && <NameTag fighter={fighter} match={match} zoom={zoom} />}
                </div>
            ))}
        </div>
    );
};
