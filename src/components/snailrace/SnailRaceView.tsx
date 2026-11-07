import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import roomImage from '../../assets/images/gamerooms/snail-room.png';
import bannerImage from '../../assets/images/snails/snail-banner.png';
import snailData from '../../assets/images/snails/snail-sprites.json';
import snailImage from '../../assets/images/snails/snail-sprites.png';
import { GameRoomScene, IRoomAvatar, IRoomFurni, ROOM_H, ROOM_W, roomPoint } from '../minigame/GameRoomScene';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting, mgt } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import '../../css/snailrace/SnailRaceView.css';

/** A text of the snail race, `snailrace.<key>`. */
const st = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`snailrace.${ key }`, fallback, parameters, replacements);

const SEATS: [number, number] = [ 2, 6 ];
const SHEET = snailData as unknown as { width: number; height: number; frames: Record<string, [number, number, number, number]> };
/** The lanes of the garden (game-rooms.py): lane n on the tiles y = 2 + n, from the start (x = 2) to the finish. */
const START_X = 2;
const FINISH_X = 12.7;
const SNAIL_ZOOM = 1.5;
const COLOURS = [ '#d6342b', '#2870dc', '#c9a10a', '#4f9a24', '#8f45c2', '#e07a14' ];

/** The hotel's furni round the race: the fence the players lean on, the finish flags, the gardener's things. */
const DECOR: IRoomFurni[] = [
    ...Array.from({ length: 12 }, (_, index) => ({ name: 'horse_track_fence', x: 1 + index, y: 1, dir: 2 })),
    { name: 'horse_fin_flag', x: 13, y: 1, dir: 2 },
    { name: 'horse_fin_flag', x: 13, y: 8, dir: 2 },
    { name: 'traffic_light', id: 1761, x: 1, y: 8, dir: 2 },
    { name: 'garden_c15_toolshed', x: 0, y: 9, dir: 2 },
    { name: 'garden15_lawnmower', x: 3, y: 9, dir: 2 },
    { name: 'garden_c15_shroomchr', x: 5, y: 9, dir: 2 },
    { name: 'garden_flo1', x: 6, y: 9, dir: 2 },
    { name: 'garden_lupin2', x: 7, y: 9, dir: 2 },
    { name: 'garden_flo3', x: 8, y: 9, dir: 2 },
    { name: 'garden_lupin5', x: 9, y: 9, dir: 2 },
    { name: 'garden_flo2', x: 10, y: 9, dir: 2 },
    { name: 'garden_caterpillar', x: 11, y: 9, dir: 2, size: 1 },
    { name: 'paris15_giftsnails', x: 13, y: 9, dir: 2 },
    { name: 'garden_mursu', x: 0, y: 3, dir: 2 },
    { name: 'garden_lupin1', x: 0, y: 5, dir: 2 },
    { name: 'garden_mursu3', x: 0, y: 7, dir: 2 }
];

interface ISnail { x: number; speed: number; mood: string; place: number; time: number; cheerIn: number }

const Sprite: FC<{ name: string; left: number; top: number; zoom?: number; className?: string }> = ({ name, left, top, zoom = SNAIL_ZOOM, className = '' }) => {
    const frame = SHEET.frames[name];

    if (!frame) return null;

    return (
        <span className={`snailrace-sprite ${ className }`} style={{
            left,
            top,
            width: frame[2] * zoom,
            height: frame[3] * zoom,
            backgroundImage: `url(${ snailImage })`,
            backgroundSize: `${ SHEET.width * zoom }px ${ SHEET.height * zoom }px`,
            backgroundPosition: `${ -frame[0] * zoom }px ${ -frame[1] * zoom }px`
        }} />
    );
};

/**
 * Habbi's snail race (`snailrace/show`, from the Game Center), in a garden of the hotel: six dirt lanes, the hotel's
 * racing fence, flags and garden furni, and the players as their avatars, leaning on the fence behind the lanes and
 * shouting for their snail. The snails crawl on their own, nap or get a burst of energy; space cheers yours on. The
 * race runs on the server's tables (`/api/hall`, game `snails`), asked for every 250 ms during a race.
 */
export const SnailRaceView: FC = () => {
    const g = useHallGame('snails', 'snailrace', 250);
    const zoom = useStageZoom(ROOM_W, ROOM_H);
    const [ tick, setTick ] = useState(0);
    const [ shouts, setShouts ] = useState<Record<number, number>>({});
    const lastMood = useRef<string[]>([]);
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

    // A cheer: the player shouts for a moment.
    useEffect(() => {
        snails.forEach((snail, seat) => {
            if (snail.mood === 'cheered' && lastMood.current[seat] !== 'cheered') setShouts((current) => ({ ...current, [seat]: performance.now() }));
        });
        lastMood.current = snails.map((snail) => snail.mood);
    }, [ snails.map((snail) => snail.mood).join() ]);

    const players = table?.players ?? [];
    const avatars: IRoomAvatar[] = useMemo(() => {
        const now = performance.now();
        const spacing = Math.min(2, 10 / Math.max(1, players.length));

        return players.map((player, seat) => ({
            key: player.userId,
            figure: player.figure,
            gender: player.gender,
            x: 2.5 + seat * spacing,
            y: 0,
            dir: 4,
            name: player.name,
            you: seat === table?.you,
            bubble: shouts[seat] && now - shouts[seat] < 1600 ? [ st('shout.1', 'Go!'), st('shout.2', 'Come on!'), st('shout.3', 'Faster!') ][seat % 3] : null,
            above: <span className="snailrace-tag__colour" style={{ background: COLOURS[seat % 6] }} />
        }));
    }, [ players.map((player) => player.userId).join(), shouts, tick ]);

    if (!g.visible) return null;

    const rules = st('rules', 'Each player has a snail. They crawl on their own, nap now and then or get a burst of energy: cheer yours on (space) to give it a boost. The first across the line wins!');

    return (
        <NativeTextTree>
            <div className="minigame-world snailrace-world">
                <div className="minigame-stage" style={{ width: ROOM_W * zoom, height: ROOM_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: ROOM_W, height: ROOM_H, transform: `scale(${ zoom })` }}>
                        <GameRoomScene image={roomImage} furni={DECOR} avatars={avatars}>
                            {table && snails.map((snail, seat) => {
                                const x = START_X + (FINISH_X - START_X) * Math.min(1, snail.x / length);
                                const point = roomPoint(x, 2 + seat + 0.5);
                                const frame = snail.mood === 'sleep' ? 2 : snail.mood === 'done' || snail.speed <= 0 ? 1 : tick % 2;
                                const nose = 31 * SNAIL_ZOOM;

                                return (
                                    <div key={seat} className="snailrace-runner" style={{ left: point.left - nose, top: point.top - 26 * SNAIL_ZOOM + 6, zIndex: Math.floor((x + 2 + seat + 0.5) * 10) + 7 }}>
                                        {snail.mood === 'turbo' && <Sprite name="dust" left={-22} top={24} />}
                                        <Sprite name={`snail_${ seat % 6 }_${ frame }`} left={0} top={0} />
                                        {snail.mood === 'sleep' && <Sprite name="zzz" left={26} top={-18} className="snailrace-zzz" />}
                                        {snail.mood === 'cheered' && <Sprite name="leaf" left={46} top={-10} className="snailrace-leaf" />}
                                        <span className="snailrace-snail-name" style={{ borderColor: COLOURS[seat % 6] }} data-browser-text>{players[seat]?.name ?? ''}</span>
                                        {snail.place > 0 && <span className={`snailrace-place is-${ snail.place }`} data-browser-text>{snail.place}</span>}
                                    </div>
                                );
                            })}
                            {racing && startsIn > 0 && <span className="minigame-count" style={{ left: ROOM_W / 2, top: ROOM_H / 2 }} data-browser-text>{Math.ceil(startsIn / 1000)}</span>}
                        </GameRoomScene>
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
