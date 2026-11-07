import { AvatarAction } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { IWobbleFighter, IWobbleMatch, WOBBLE_FALL } from '../../api';
import buoysImage from '../../assets/images/wobble/wobble-buoys.png';
import cloudsImage from '../../assets/images/wobble/wobble-clouds.png';
import fallsImage from '../../assets/images/wobble/wobble-falls.png';
import hitsImage from '../../assets/images/wobble/wobble-hits.png';
import frontImage from '../../assets/images/wobble/wobble-rooftop-front.png';
import roomImage from '../../assets/images/wobble/wobble-rooftop.png';
import splashImage from '../../assets/images/wobble/wobble-splash.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';

/**
 * Habbo's original Wobble Squabble room, the rooftop `md_a` of the Shockwave client,
 * drawn twice its size so that the hotel's avatars fit its tiles: the sky with its clouds, the rooftop, the waterfall,
 * the line of buoys across the pool, the two fighters on it, and the roof's front edge over everything.
 *
 * The room's tiles are 32x16 (64x32 here); tile (x, y) at height h has its top corner at
 * (270 + 16 * (x - y), 158 + 8 * (x + y) - 8 * h) in the room's pixels. The buoys stand on x = 21, y = 8 to 18, height 8.
 */
export const ROOM_SCALE = 2;
export const POOL_WIDTH = 720 * ROOM_SCALE;
export const POOL_HEIGHT = 540 * ROOM_SCALE;
export const SKY = 'rgb(156, 206, 255)';

const BUOY_X = 21;
const BUOY_HEIGHT = 8;
/** The water's level, where the fallen swim (the pool is full to its rim, height 7). */
const WATER_HEIGHT = 7;
/** Place 0 of the duel stands on buoy y = 10, place 7 on y = 17; the buoys 8, 9 and 18 are the queue's. */
const FIRST_PLACE = 10;

/** The centre of tile (x, y) at height h, in this scene's pixels. */
export const roomTile = (x: number, y: number, h: number) => ({
    left: ROOM_SCALE * (270 + 16 * (x - y)),
    top: ROOM_SCALE * (158 + 8 * (x + y + 1) - 8 * h)
});

const placeTile = (pos: number) => roomTile(BUOY_X, FIRST_PLACE + pos, BUOY_HEIGHT);
const depth = (y: number) => 100 + Math.round(y * 10);

const sprite = (image: string, width: number, height: number, frames: number, frame: number): CSSProperties => ({
    width: width * ROOM_SCALE,
    height: height * ROOM_SCALE,
    backgroundImage: `url(${image})`,
    backgroundSize: `${width * frames * ROOM_SCALE}px ${height * ROOM_SCALE}px`,
    backgroundPosition: `${-frame * width * ROOM_SCALE}px 0`
});

/** The line of buoys: orange at the far end, yellow in the middle, orange with a mark at the near end (as in md_a). */
const Buoys: FC = () => (
    <>
        {Array.from({ length: 11 }, (_, index) => {
            const y = 8 + index;
            const kind = y <= 11 ? 2 : y <= 14 ? 1 : 0;
            const centre = roomTile(BUOY_X, y, BUOY_HEIGHT);

            return <span key={y} className="wb-buoy" style={{ ...sprite(buoysImage, 36, 32, 3, kind), left: centre.left - 18 * ROOM_SCALE, top: centre.top - 11 * ROOM_SCALE, zIndex: depth(y) }} />;
        })}
    </>
);

const Clouds: FC = () => (
    <div className="wb-clouds">
        {[ [ 4, 0, 70 ], [ 1, 38, 95 ], [ 3, 14, 120 ], [ 0, 60, 80 ], [ 2, 26, 105 ] ].map(([ kind, top, seconds ], index) => (
            <span key={index} className="wb-cloud" style={{ ...sprite(cloudsImage, 80, 64, 5, kind), top: top * ROOM_SCALE, animationDuration: `${seconds}s`, animationDelay: `${-index * seconds / 5}s` }} />
        ))}
    </div>
);

/**
 * A fighter on the buoys, tilted by their balance: the one at the far end looks down the line (direction 4), the
 * other up it (direction 0). Hit, they get one of the game's bubbles; fallen, they swim beside the line with a splash.
 */
const Fighter: FC<{ fighter: IWobbleFighter; showFall: boolean; hitFrame: number }> = ({ fighter, showFall, hitFrame }) => {
    const picture = useUnoAvatar(fighter.figure, fighter.gender, fighter.side === 0 ? 4 : 0, AvatarAction.POSTURE_STAND);
    const feet = placeTile(fighter.pos);
    const y = FIRST_PLACE + fighter.pos;
    const recent = fighter.actionAgo >= 0 && fighter.actionAgo < 450;
    const tilt = Math.max(-WOBBLE_FALL, Math.min(WOBBLE_FALL, fighter.balance)) * 0.42;
    const fallen = fighter.fell && showFall;
    // Fallen to the left, into the water on x = 20; to the right, on x = 22 (as Kepler drops them).
    const side = fighter.balance < 0 ? -1 : 1;
    const water = roomTile(BUOY_X + side, y, WATER_HEIGHT);
    const classes = [
        'wb-fighter',
        recent && fighter.action === 'push' ? 'is-pushing' : '',
        recent && fighter.action === 'miss' ? 'is-lunging' : '',
        recent && fighter.action === 'hit' ? 'is-hit' : '',
        fighter.stabilising ? 'is-stabilising' : '',
        fallen ? 'is-fallen' : ''
    ].join(' ');

    return (
        <>
            <div className={classes} style={{ left: feet.left, top: feet.top, zIndex: depth(y) + 5, '--wb-toward': fighter.side === 0 ? -1 : 1, '--wb-fall': side } as CSSProperties}>
                <div className="wb-fighter__tilt" style={{ transform: `rotate(${tilt}deg)` }}>
                    <div className="wb-fighter__body">
                        {picture && <img className="wb-fighter__avatar" src={picture} alt="" draggable={false} />}
                    </div>
                </div>
            </div>
            {recent && fighter.action === 'hit' && !fallen && (
                <span className="wb-hit" style={{ ...sprite(hitsImage, 72, 56, 8, hitFrame + (fighter.side === 0 ? 0 : 4)), left: feet.left, top: feet.top - 112, zIndex: 2000 }} />
            )}
            {fallen && (
                <>
                    <span className="wb-splash" style={{ ...sprite(splashImage, 48, 48, 10, 0), left: water.left, top: water.top, zIndex: depth(y) + 6 }} />
                    {picture && (
                        <div className="wb-swimmer" style={{ left: water.left, top: water.top, zIndex: depth(y) + 4 }}>
                            <img src={picture} alt="" draggable={false} />
                        </div>
                    )}
                </>
            )}
        </>
    );
};

const NameTag: FC<{ fighter: IWobbleFighter; match: IWobbleMatch }> = ({ fighter, match }) => {
    const feet = placeTile(fighter.pos);
    const stars = Array.from({ length: match.rules.roundsToWin }, (_, index) => index < fighter.wins);

    return (
        <div className={`wb-tag ${fighter.you ? 'is-you' : ''}`} style={{ left: feet.left, top: feet.top - 124, zIndex: 1900 }}>
            <span className="wb-tag__name">{fighter.name}</span>
            <span className="wb-tag__stars">{stars.map((won, index) => <span key={index} className={won ? 'is-won' : ''}>★</span>)}</span>
        </div>
    );
};

export const WobbleScene: FC<{ match: IWobbleMatch | null }> = ({ match }) => {
    const showFall = match?.state === 'round_over' || match?.state === 'finished';
    const hitFrame = match ? (match.round + match.log.length) % 4 : 0;

    return (
        <div className={`wb-scene ${match?.sudden ? 'is-sudden' : ''}`} style={{ width: POOL_WIDTH, height: POOL_HEIGHT, background: SKY }}>
            <Clouds />
            <img className="wb-scene__layer" src={roomImage} alt="" width={POOL_WIDTH} height={POOL_HEIGHT} draggable={false} />
            <span className="wb-falls" style={{ ...sprite(fallsImage, 128, 200, 7, 0), left: 470 * ROOM_SCALE, top: 80 * ROOM_SCALE }} />
            <Buoys />
            {match?.fighters.map((fighter) => (
                <div key={fighter.userId}>
                    <Fighter fighter={fighter} showFall={showFall} hitFrame={hitFrame} />
                    {!(fighter.fell && showFall) && <NameTag fighter={fighter} match={match} />}
                </div>
            ))}
            <img className="wb-scene__layer wb-scene__front" src={frontImage} alt="" width={708 * ROOM_SCALE} height={311 * ROOM_SCALE} style={{ top: 266 * ROOM_SCALE }} draggable={false} />
        </div>
    );
};
