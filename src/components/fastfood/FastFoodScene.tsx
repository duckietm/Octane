import { AvatarAction } from '@octane/renderer';
import { CSSProperties, FC, ReactElement } from 'react';
import { FASTFOOD_BIG_PARACHUTE, FASTFOOD_MISSILE, FASTFOOD_SHIELD, IFastFoodGame, IFastFoodPhysics, IFastFoodPlayer, fft } from '../../api';
import spritesData from '../../assets/images/fastfood/ff-sprites.json';
import spritesImage from '../../assets/images/fastfood/ff-sprites.png';
import backgroundImage from '../../assets/images/fastfood/ff-bg.jpg';
import lobbyImage from '../../assets/images/fastfood/ff-bg-lobby.jpg';
import illustrationImage from '../../assets/images/fastfood/ff-illustration.png';
import logoImage from '../../assets/images/fastfood/ff-logo.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';

/**
 * The restaurant of Habbo's Fast Food (BaseJump, 2010), on its 1920x960 stage: a table a player (at x = 960 + (seat -
 * middle) * 472, the original's 490, 962, 1434 for three), its two diners, the player's name and stars, and the plate
 * falling from y = 200 (height 1) to y = 820 (the table, height 0) as the game draws it (200 + 620 (1 - height)).
 * Every sprite is drawn at its place minus its registration offset (from the game's asset manifest).
 */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 960;
const TABLE_Y = 820;
const PLATE_TOP = 200;
const PLATE_RANGE = 620;
const LANE_GAP = 472;
const CRASH_FRAME_MS = 70;
const MISSILE_MS = 900;

type Frame = [number, number, number, number, number, number];

const SHEET = spritesData as unknown as { width: number; height: number; frames: Record<string, Frame> };
const FOODS = [ 'soup', 'pizza', 'burger', 'tray', 'cake', 'tray' ];
const CRASH_FRAMES: Record<string, number> = { soup: 8, pizza: 6, burger: 7, tray: 8, cake: 11 };
/** Each table's parachutes and missiles (the original's level skins): red, blue, green. */
const SKINS = [ '', 'L5_', 'L10_' ];

export const laneX = (seat: number, tables: number) => STAGE_WIDTH / 2 + (seat - (tables - 1) / 2) * LANE_GAP;
export const plateScreenY = (height: number) => PLATE_TOP + PLATE_RANGE * (1 - height);

export const frameOf = (name: string): Frame | undefined => SHEET.frames[name];

/** A sprite of the sheet, its registration point at (x, y) (or its top left corner there: `corner`). */
export const Sprite: FC<{ name: string; x: number; y: number; corner?: boolean; className?: string; style?: CSSProperties }> = ({ name, x, y, corner = false, className = '', style }) => {
    const frame = SHEET.frames[name];

    if (!frame) return null;

    const [ sx, sy, w, h, ox, oy ] = frame;

    return (
        <span
            className={`ff-sprite ${className}`}
            style={{
                left: corner ? x : x - ox,
                top: corner ? y : y - oy,
                width: w,
                height: h,
                backgroundImage: `url(${spritesImage})`,
                backgroundSize: `${SHEET.width}px ${SHEET.height}px`,
                backgroundPosition: `${-sx}px ${-sy}px`,
                ...style
            }} />
    );
};

/** Where a plate is on the screen now, and how it falls (the view moved on by the client). */
export interface IPlateNow {
    y: number;
    v: number;
    chute: boolean;
    phase: string;
}

/** The player's head, from the hotel's avatar (the original showed the Habbo's head by their name). */
const Head: FC<{ figure: string; gender: string; x: number }> = ({ figure, gender, x }) => {
    const picture = useUnoAvatar(figure, gender, 2, AvatarAction.POSTURE_STAND);

    return (
        <span className="ff-head" style={{ left: x - 27, top: 52 }}>
            {picture ? <img src={picture} alt="" draggable={false} /> : <Sprite name="player1" x={0} y={0} corner />}
        </span>
    );
};

const Table: FC<{ x: number; left: string; right: string; leftMood: string; rightMood: string }> = ({ x, left, right, leftMood, rightMood }) => (
    <>
        <Sprite name={`${left}_${leftMood}`} x={x} y={TABLE_Y} />
        <Sprite name="table_middle_0" x={x} y={TABLE_Y} />
        <Sprite name={`${right}_${rightMood}`} x={x} y={TABLE_Y} />
    </>
);

/** A table's plate: the food (empty while the kitchen prepares it), its parachute, its shield, or its crash. */
const Plate: FC<{ player: IFastFoodPlayer; now: IPlateNow; x: number; tick: number; physics: IFastFoodPhysics }> = ({ player, now, x, tick, physics }) => {
    const plate = player.plate;

    if (!plate) return null;

    const food = FOODS[plate.food] ?? 'soup';
    const skin = SKINS[player.seat] ?? '';

    if (plate.phase === 'crashed') {
        if (plate.falseStart) return null;

        const frame = Math.min(CRASH_FRAMES[food], 1 + Math.floor(plate.endedAgo / CRASH_FRAME_MS));

        return plate.endedAgo < physics.plateTimerMs ? <Sprite name={`${food}_crash_${frame}`} x={x} y={TABLE_Y} /> : null;
    }

    if (plate.phase === 'landed') return plate.endedAgo < physics.plateTimerMs ? <Sprite name={`${food}_2`} x={x} y={TABLE_Y} /> : null;

    const y = plateScreenY(now.y);
    const waiting = plate.phase === 'hanging' && plate.readyIn > 0;
    const image = plate.falseStart || waiting ? `${food}_1` : now.phase === 'hanging' ? `${food}_2` : `${food}_3`;
    const frame = frameOf(image);
    const top = frame ? y - frame[5] : y;
    const width = frame ? frame[2] : 0;
    const parts: ReactElement[] = [ <Sprite key="food" name={image} x={x} y={y} /> ];
    const above = (name: string) => {
        const chute = frameOf(name);

        if (!chute) return;

        parts.push(<Sprite key="chute" name={name} x={x - (frame ? frame[4] : 0) + width / 2 - chute[2] / 2} y={top - chute[3]} corner />);
    };

    if (!plate.falseStart) {
        if (now.phase === 'falling' && !now.chute) above(`${skin}parachute_closed_${tick % 2 ? 2 : 1}`);
        if (now.chute && now.phase !== 'broken') above(plate.big ? 'pu_big_parachute' : `${skin}parachute_open_${Math.floor(tick / 2) % 2 ? 4 : 2}`);
    }

    if (plate.shield) {
        const shield = frameOf('shield_1');

        if (shield) parts.push(<Sprite key="shield" name={`shield_${1 + (Math.floor(tick / 2) % 3)}`} x={x - shield[2] / 2} y={top + (frame ? frame[3] : 0) / 2 - shield[3] / 2} corner className="is-glow" />);
    }

    return <>{parts}</>;
};

/** The stars a table served, on the original's sign (its slots 30 px apart, the first at 28, 38). */
const Stars: FC<{ x: number; stars: number; plates: number }> = ({ x, stars, plates }) => {
    const sign = frameOf('stars_sign');
    const left = x - (sign ? sign[2] : 209) / 2;

    return (
        <>
            <Sprite name="stars_sign" x={left} y={218} corner />
            {Array.from({ length: 6 }, (_, index) => (index < plates
                ? <Sprite key={index} name={index < stars ? 'star_yellow' : 'star_blank'} x={left + index * 30 + 28 - 9.5} y={218 + 38 - 9.5} corner className={index < stars ? 'is-star' : 'is-blank'} />
                : null))}
        </>
    );
};

const moodOf = (player: IFastFoodPlayer, now: IPlateNow | undefined, front: boolean): string => {
    const plate = player.plate;

    if (plate && plate.endedAgo >= 0 && plate.endedAgo < 2000 && front && !plate.falseStart) {
        if (plate.phase === 'landed') return 'happy';
        if (plate.phase === 'crashed') return 'angry';
    }

    if (now && now.phase !== 'hanging' && now.y < 0.45 && now.v > 0.55) return 'woah';

    return 'normal';
};

export const FastFoodScene: FC<{
    game: IFastFoodGame | null;
    physics: IFastFoodPhysics | null;
    plates: Record<number, IPlateNow>;
    tick: number;
    since: number;
}> = ({ game, physics, plates, tick, since }) => {
    if (!game || game.state === 'waiting' || !physics) {
        return (
            <div className="ff-scene is-lobby" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
                <img className="ff-scene__bg" src={lobbyImage} alt="" draggable={false} />
                <img className="ff-scene__logo" src={logoImage} alt="" draggable={false} />
                <img className="ff-scene__illustration" src={illustrationImage} alt="" draggable={false} />
            </div>
        );
    }

    const tables = game.rules.tables;
    const go = game.log.find((event) => event.type === 'go');
    const lanes = game.players.map((player) => ({ player, x: laneX(player.seat, tables) }));
    const missiles = game.missiles.map((missile, index) => {
        const from = lanes.find((lane) => lane.player.userId === missile.from);
        const to = lanes.find((lane) => lane.player.userId === missile.to);

        if (!from || !to) return null;

        const target = plates[missile.to];
        const progress = Math.min(1, Math.max(0, 1 - (missile.hitIn - since) / MISSILE_MS));
        const sx = from.x;
        const sy = TABLE_Y - 160;
        const tx = to.x;
        const ty = plateScreenY(target ? target.y : 0.5) - 90;
        const px = sx + (tx - sx) * progress;
        const py = sy + (ty - sy) * progress - Math.sin(progress * Math.PI) * 160;
        const angle = Math.atan2(ty - sy - Math.cos(progress * Math.PI) * 160 * Math.PI, tx - sx) * 180 / Math.PI + 90;
        const skin = SKINS[from.player.seat] ?? '';

        return <Sprite key={`m${index}`} name={`${skin}missile`} x={px - 20} y={py - 37} corner className="ff-missile" style={{ transform: `rotate(${angle}deg)` }} />;
    });
    const blasts = game.log.filter((event) => event.type === 'hit' && event.ago + since < 11 * 60).map((event) => {
        const lane = lanes.find((entry) => entry.player.userId === event.userId);

        if (!lane) return null;

        const target = plates[event.userId];
        const frame = 1 + Math.floor((event.ago + since) / 60);
        const explosion = frameOf(`explosion_${frame}`);

        if (!explosion) return null;

        return <Sprite key={`x${event.seq}`} name={`explosion_${frame}`} x={lane.x - explosion[2] / 2} y={plateScreenY(target ? target.y : 0.3) - 60 - explosion[3] / 2} corner className="is-add ff-blast" />;
    });

    return (
        <div className="ff-scene" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
            <img className="ff-scene__bg" src={backgroundImage} alt="" draggable={false} />
            {lanes.map(({ player, x }) => {
                const now = plates[player.userId];
                const left = 'abc'[(game.id + player.seat) % 3];
                const right = 'def'[(game.id * 7 + player.seat * 2) % 3];
                const front = moodOf(player, now, true);

                return (
                    <div key={player.userId} className={`ff-lane ${player.you ? 'is-you' : ''}`}>
                        <span className="ff-name" style={{ left: x - 220, top: 12 }} data-browser-text>{player.name}</span>
                        <Head figure={player.figure} gender={player.gender} x={x} />
                        <Stars x={x} stars={player.stars} plates={game.rules.plates} />
                        <Table x={x} left={left} right={right} leftMood={front} rightMood={front === 'woah' ? 'woah' : 'normal'} />
                        {now && <Plate player={player} now={now} x={x} tick={tick} physics={physics} />}
                        {player.held > 0 && <Sprite name={player.held === FASTFOOD_MISSILE ? 'rocket_small' : player.held === FASTFOOD_SHIELD ? 'shield_small' : 'big_parachute_small'} x={x + 110} y={226} corner className="ff-held" />}
                    </div>
                );
            })}
            {missiles}
            {blasts}
            {game.state === 'countdown' && (
                <div className="ff-countdown" data-browser-text>
                    <span className="ff-countdown__title">{fft('get_ready', 'Get ready!')}</span>
                    <span className="ff-countdown__number">{Math.max(1, Math.ceil((game.timeLeft - since) / 1000))}</span>
                </div>
            )}
            {game.state === 'playing' && go && go.ago + since < 1200 && <div className="ff-countdown is-go" data-browser-text><span className="ff-countdown__number">{fft('go', 'Go!')}</span></div>}
        </div>
    );
};

export const FASTFOOD_POWER_BUTTONS = [ '', 'button2_PU_rocket_normal', 'button2_PU_shield_normal', 'button2_PU_bigchute_normal' ];
export const skinOf = (seat: number) => SKINS[seat] ?? '';
export const isBigParachute = (power: number) => power === FASTFOOD_BIG_PARACHUTE;
