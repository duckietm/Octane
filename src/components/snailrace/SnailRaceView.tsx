import { FC, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/snails/snail-banner.png';
import gardenImage from '../../assets/images/snails/snail-garden.png';
import snailData from '../../assets/images/snails/snail-sprites.json';
import snailImage from '../../assets/images/snails/snail-sprites.png';
import { MiniGameAvatar, MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting, mgt } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import '../../css/snailrace/SnailRaceView.css';

/** A text of the snail race, `snailrace.<key>`. */
const st = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`snailrace.${key}`, fallback, parameters, replacements);

/** The garden (snail-garden.png, deploy/scripts/snail-art.py) is drawn at 1x and shown twice its size. */
const STAGE_W = 960;
const STAGE_H = 680;
const LANE_TOP = 192;
const LANE_H = 60;
const START_X = 128;
const FINISH_X = 880;
/** The snail's nose, from the left of its picture (2x). */
const NOSE = 62;
const SEATS: [number, number] = [ 2, 6 ];
const SHEET = snailData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number]> };

interface ISnail { x: number; speed: number; mood: string; place: number; time: number; cheerIn: number }

const Sprite: FC<{ name: string; x: number; y: number; className?: string }> = ({ name, x, y, className = '' }) => {
    const frame = SHEET.frames[name];

    if (!frame) return null;

    return (
        <span className={`snailrace-sprite ${className}`} style={{
            left: x,
            top: y,
            width: frame[2] * 2,
            height: frame[3] * 2,
            backgroundImage: `url(${snailImage})`,
            backgroundSize: `${SHEET.width * 2}px ${SHEET.height * 2}px`,
            backgroundPosition: `${-frame[0] * 2}px ${-frame[1] * 2}px`
        }} />
    );
};

/**
 * Habbi's snail race (`snailrace/show`, from the Game Center): a garden with six lanes, a snail a player. The snails
 * crawl on their own, nap or get a burst of energy; space cheers yours on. The players watch from the grass in front.
 * The race runs on the server's tables (`/api/hall`, game `snails`), asked for every 250 ms during a race.
 */
export const SnailRaceView: FC = () => {
    const g = useHallGame('snails', 'snailrace', 250);
    const zoom = useStageZoom(STAGE_W, STAGE_H);
    const [ tick, setTick ] = useState(0);
    const table = g.table;
    const board = table?.board;
    const racing = table?.state === 'playing';
    const snails = (board?.snails as ISnail[]) ?? [];
    const length = Number(board?.length ?? 100);
    const startsIn = Number(board?.startsIn ?? 0);
    const me = table ? snails[table.you] : undefined;
    const canCheer = !!me && racing && !!table.players[table.you]?.waiting;

    useEffect(() => {
        if (!racing) return;

        const timer = setInterval(() => setTick((value) => value + 1), 250);
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (event.key !== ' ' || event.repeat || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();
            g.send({ cheer: true });
        };

        window.addEventListener('keydown', onKey, true);

        return () => {
            clearInterval(timer);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [ racing, g.send ]);

    if (!g.visible) return null;

    const rules = st('rules', 'Each player has a snail. They crawl on their own, nap now and then or get a burst of energy: cheer yours on (space) to give it a boost. The first across the line wins!');
    const players = table?.players ?? [];
    const spacing = Math.min(150, (STAGE_W - 80) / Math.max(1, players.length));
    const first = (STAGE_W - spacing * (players.length - 1)) / 2;

    return (
        <NativeTextTree>
            <div className="minigame-world snailrace-world">
                <div className="minigame-stage" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${zoom})` }}>
                        <img className="minigame-backdrop" src={gardenImage} alt="" width={STAGE_W} height={STAGE_H} draggable={false} />
                        {players.map((player, seat) => (
                            <span key={`name-${seat}`} className={`snailrace-name ${seat === table.you ? 'is-you' : ''}`} style={{ top: LANE_TOP + seat * LANE_H + 8 }} data-browser-text>{player.name}</span>
                        ))}
                        {table && snails.map((snail, seat) => {
                            const left = START_X + (FINISH_X - START_X) * Math.min(1, snail.x / length) - NOSE;
                            const top = LANE_TOP + seat * LANE_H + 4;
                            const frame = snail.mood === 'sleep' ? 2 : snail.mood === 'done' || snail.speed <= 0 ? 1 : tick % 2;

                            return (
                                <div key={seat} className="snailrace-runner" style={{ left, top }}>
                                    {snail.mood === 'turbo' && <Sprite name="dust" x={-26} y={28} />}
                                    <Sprite name={`snail_${seat % 6}_${frame}`} x={0} y={0} />
                                    {snail.mood === 'sleep' && <Sprite name="zzz" x={30} y={-22} className="snailrace-zzz" />}
                                    {snail.mood === 'cheered' && <Sprite name="leaf" x={56} y={-12} className="snailrace-leaf" />}
                                    {snail.place > 0 && <span className={`snailrace-place is-${snail.place}`} data-browser-text>{snail.place}</span>}
                                </div>
                            );
                        })}
                        {players.map((player, seat) => (
                            <div key={`fan-${player.userId}`} className={`snailrace-fan ${seat === table.you ? 'is-you' : ''}`} style={{ left: first + seat * spacing }}>
                                <MiniGameAvatar player={player} direction={seat < players.length / 2 ? 2 : 4} />
                                <span className={`snailrace-fan__flag is-${seat % 6}`} data-browser-text>{player.name}</span>
                                {snails[seat]?.mood === 'cheered' && <span className="snailrace-fan__shout" data-browser-text>{st('shout', 'Go!')}</span>}
                            </div>
                        ))}
                        {racing && startsIn > 0 && <span className="minigame-count" style={{ left: STAGE_W / 2, top: LANE_TOP + 3 * LANE_H }} data-browser-text>{Math.ceil(startsIn / 1000)}</span>}
                    </div>
                </div>

                <MiniGameTopBar game="snails" g={g} title={st('title', 'The snail race')}>
                    {racing && <span className="minigame-topbar__info">{startsIn > 0 ? st('starting', 'On your marks...') : st('racing', 'They are off!')}</span>}
                </MiniGameTopBar>

                {table?.state === 'waiting' && <MiniGameWaiting game="snails" g={g} table={table} seats={SEATS} className="snailrace-panel" rules={rules} />}

                {racing && me && (
                    <div className="minigame-panel snailrace-panel snailrace-cheer" data-browser-text>
                        <Button variant="success" disabled={!canCheer} onClick={() => g.send({ cheer: true })}>
                            {canCheer ? st('cheer', 'Cheer your snail! (space)') : me.place > 0 ? st('arrived', 'Your snail has arrived!') : startsIn > 0 ? st('ready', 'Get ready...') : st('wait', 'Catching its breath...')}
                        </Button>
                    </div>
                )}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="snails" g={g} className="snailrace-lobby" title={st('title', 'The snail race')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="snails" g={g} table={table} className="snailrace-results" title={st('results', 'The finish')}
                    rows={snails.map((snail, seat) => ({ seat, place: snail.place, detail: snail.time > 0 ? mgt('seconds', '%n% s', [ 'n' ], [ (snail.time / 1000).toFixed(1) ]) : st('not_arrived', 'not arrived') }))
                        .sort((a, b) => (a.place || 99) - (b.place || 99))} />
            )}
        </NativeTextTree>
    );
};
