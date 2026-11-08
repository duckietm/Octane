import { FC, useEffect, useRef, useState } from 'react';
import { lmt } from '../../api';
import jungleImage from '../../assets/images/lostmonkey/lm-jungle.png';
import patternsData from '../../assets/images/lostmonkey/lm-junglejam.json';
import { LmSprite } from './LostMonkeySprites';

/**
 * Jungle Jam, one of Lost Monkey's games: the balls fall on four drums following the game's own beats (its files x16
 * to x126: a drum, drums together, or a rest), faster and faster. Hit a drum (D F J K, 1 2 3 4, or a click) when its
 * ball lands on it; ten good hits in a row double the points, then three, then four times. One minute.
 */
const PATTERNS = patternsData as unknown as string[][];
const W = 960;
const H = 640;
const LANES = [ 210, 390, 570, 750 ];
const HEAD_Y = 470;
const GAME_MS = 60_000;
const START_MS = 2500;
const PERFECT_MS = 90;
const GOOD_MS = 190;
const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, '1': 0, '2': 1, '3': 2, '4': 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

interface IBall { lane: number; at: number; hit: boolean; missed: boolean }

/** The beats of a game: the patterns one after the other, the tempo rising from 95 to 160 beats a minute. */
const schedule = (): IBall[] => {
    const balls: IBall[] = [];
    let time = START_MS;
    let index = 0;

    while (time < GAME_MS + START_MS - 1500) {
        const progress = (time - START_MS) / GAME_MS;
        const pattern = PATTERNS[Math.min(PATTERNS.length - 1, Math.floor(progress * PATTERNS.length * 0.6) + (index % 4))] ?? [ '1', '2', '3', '4' ];
        const beat = 60_000 / (95 + 65 * progress);

        for (const step of pattern) {
            for (const lane of step) {
                if (lane !== '0') balls.push({ lane: Number(lane) - 1, at: time, hit: false, missed: false });
            }

            time += beat;
        }

        index++;
    }

    return balls;
};

export const JungleJamGame: FC<{ zoom: number; onEnd: (score: number) => void }> = ({ zoom, onEnd }) => {
    const [ , setFrame ] = useState(0);
    const state = useRef({ start: performance.now(), balls: schedule(), score: 0, streak: 0, best: 0, splashes: [] as { lane: number; at: number; good: boolean }[], ended: false });

    const multiplier = () => Math.min(4, 1 + Math.floor(state.current.streak / 10));

    const hit = (lane: number) => {
        const game = state.current;
        const now = performance.now() - game.start;
        let best: IBall | null = null;

        for (const ball of game.balls) {
            if (ball.lane !== lane || ball.hit || ball.missed) continue;
            if (Math.abs(ball.at - now) <= GOOD_MS && (!best || Math.abs(ball.at - now) < Math.abs(best.at - now))) best = ball;
        }

        if (best) {
            best.hit = true;
            game.streak++;
            game.best = Math.max(game.best, game.streak);
            game.score += (Math.abs(best.at - now) <= PERFECT_MS ? 100 : 50) * multiplier();
            game.splashes.push({ lane, at: now, good: true });
        } else {
            game.streak = 0;
            game.splashes.push({ lane, at: now, good: false });
        }
    };

    useEffect(() => {
        let frame = 0;
        const loop = () => {
            const game = state.current;
            const now = performance.now() - game.start;

            for (const ball of game.balls) {
                if (!ball.hit && !ball.missed && now - ball.at > GOOD_MS) {
                    ball.missed = true;
                    game.streak = 0;
                }
            }

            game.splashes = game.splashes.filter((splash) => now - splash.at < 350);

            if (now >= GAME_MS + START_MS && !game.ended) {
                game.ended = true;
                onEnd(game.score);
                return;
            }

            setFrame((value) => value + 1);
            frame = requestAnimationFrame(loop);
        };
        const onKey = (event: KeyboardEvent) => {
            const lane = KEYS[event.key.toLowerCase()];

            if (lane === undefined || event.repeat) return;

            event.preventDefault();
            event.stopPropagation();
            hit(lane);
        };

        frame = requestAnimationFrame(loop);
        window.addEventListener('keydown', onKey, true);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onKey, true);
        };
    }, []);

    const game = state.current;
    const now = performance.now() - game.start;
    const fall = Math.max(900, 1700 - ((now - START_MS) / GAME_MS) * 700);
    const left = Math.max(0, Math.ceil((GAME_MS + START_MS - now) / 1000));

    return (
        <div className="lm-game" style={{ width: W * zoom, height: H * zoom }}>
            <div className="lm-game__inner" style={{ width: W, height: H, transform: `scale(${ zoom })`, backgroundImage: `url(${ jungleImage })` }}>
                <LmSprite name="title_junglejam" x={W / 2} y={70} scale={0.9} />
                <div className="lm-game__score" data-browser-text>
                    <span>{lmt('game.score', 'Score')}</span><strong>{game.score}</strong>
                    <span>{lmt('game.time', 'Time')}</span><strong>{now < START_MS ? 60 : left} s</strong>
                </div>
                {multiplier() > 1 && <span className="lm-game__multiplier" data-browser-text>{multiplier()}x</span>}
                {LANES.map((x, lane) => (
                    <div key={lane} className={`lm-jam__lane ${ game.splashes.some((splash) => splash.lane === lane && !splash.good) ? 'is-miss' : '' }`} style={{ left: x - 58 }} />
                ))}
                {game.balls.map((ball, index) => {
                    if (ball.hit) return null;

                    const progress = 1 - (ball.at - now) / fall;

                    if (progress < 0 || progress > 1.25) return null;

                    return <LmSprite key={index} name="jj_ball" x={LANES[ball.lane]} y={HEAD_Y * progress} anchor="centre" scale={1.1} className={ball.missed ? 'is-missed' : ''} />;
                })}
                {LANES.map((x, lane) => (
                    <LmSprite key={lane} name="jj_drum" x={x} y={H - 6} scale={1} onClick={() => hit(lane)} className="lm-jam__drum" />
                ))}
                {game.splashes.filter((splash) => splash.good).map((splash, index) => <LmSprite key={`s${ index }`} name="jj_splash" x={LANES[splash.lane]} y={HEAD_Y} anchor="centre" />)}
                <div className="lm-jam__keys" data-browser-text>
                    {[ 'D', 'F', 'J', 'K' ].map((key, lane) => <span key={key} style={{ left: LANES[lane] }}>{key}</span>)}
                </div>
                {now < START_MS && <span className="lm-game__count" data-browser-text>{Math.ceil((START_MS - now) / 1000)}</span>}
            </div>
        </div>
    );
};
