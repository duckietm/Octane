import { FC, useEffect, useRef, useState } from 'react';
import { lmt } from '../../api';
import jungleImage from '../../assets/images/lostmonkey/lm-jungle.png';
import { LmSprite } from './LostMonkeySprites';

/**
 * Banana Drama, one of Lost Monkey's games: bananas and bombs fall from the palms; catch the bananas in the crate (the
 * mouse, or the arrows) and keep away from the bombs. A bomb in the crate blows up (three lives). Each banana caught
 * in a row is worth more; it falls faster and faster for a minute and a quarter.
 */
const W = 960;
const H = 640;
const CRATE_Y = 600;
const CRATE_HALF = 46;
const GAME_MS = 75_000;
const START_MS = 2500;
const LIVES = 3;

interface IItem { x: number; y: number; speed: number; bomb: boolean; done: boolean }

export const BananaDramaGame: FC<{ zoom: number; onEnd: (score: number) => void }> = ({ zoom, onEnd }) => {
    const [ , setFrame ] = useState(0);
    const stageRef = useRef<HTMLDivElement>(null);
    const state = useRef({ start: performance.now(), last: performance.now(), next: START_MS, crate: W / 2, items: [] as IItem[], score: 0, streak: 0, lives: LIVES, booms: [] as { x: number; at: number }[], held: new Set<string>(), ended: false });

    useEffect(() => {
        let frame = 0;
        const loop = () => {
            const game = state.current;
            const clock = performance.now();
            const now = clock - game.start;
            const dt = Math.min(0.05, (clock - game.last) / 1000);

            game.last = clock;

            if (game.held.has('ArrowLeft')) game.crate -= 700 * dt;
            if (game.held.has('ArrowRight')) game.crate += 700 * dt;
            game.crate = Math.max(60, Math.min(W - 60, game.crate));

            const progress = Math.max(0, (now - START_MS) / GAME_MS);

            if (now >= game.next && now < GAME_MS + START_MS) {
                game.items.push({ x: 70 + Math.random() * (W - 140), y: -40, speed: 210 + 330 * progress + Math.random() * 60, bomb: Math.random() < 0.18 + 0.17 * progress, done: false });
                game.next = now + Math.max(330, 900 - 560 * progress) * (0.7 + Math.random() * 0.6);
            }

            for (const item of game.items) {
                if (item.done) continue;

                item.y += item.speed * dt;

                if (item.y >= CRATE_Y - 70 && item.y <= CRATE_Y - 20 && Math.abs(item.x - game.crate) <= CRATE_HALF) {
                    item.done = true;

                    if (item.bomb) {
                        game.lives--;
                        game.streak = 0;
                        game.booms.push({ x: game.crate, at: now });
                    } else {
                        game.streak++;
                        game.score += 10 * Math.min(10, game.streak);
                    }
                } else if (item.y > H + 40) {
                    item.done = true;
                    if (!item.bomb) game.streak = 0;
                }
            }

            game.items = game.items.filter((item) => !item.done || item.y < H + 60);
            game.booms = game.booms.filter((boom) => now - boom.at < 640);

            if ((game.lives <= 0 || now >= GAME_MS + START_MS) && !game.ended) {
                game.ended = true;
                setTimeout(() => onEnd(game.score), game.lives <= 0 ? 700 : 0);
            }

            setFrame((value) => value + 1);
            if (!game.ended || game.booms.length) frame = requestAnimationFrame(loop);
        };
        const onDown = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

            event.preventDefault();
            event.stopPropagation();
            state.current.held.add(event.key);
        };
        const onUp = (event: KeyboardEvent) => state.current.held.delete(event.key);

        frame = requestAnimationFrame(loop);
        window.addEventListener('keydown', onDown, true);
        window.addEventListener('keyup', onUp, true);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onDown, true);
            window.removeEventListener('keyup', onUp, true);
        };
    }, []);

    const onMove = (event: React.MouseEvent) => {
        const box = stageRef.current?.getBoundingClientRect();

        if (box) state.current.crate = (event.clientX - box.left) / zoom;
    };

    const game = state.current;
    const now = performance.now() - game.start;
    const left = Math.max(0, Math.ceil((GAME_MS + START_MS - now) / 1000));

    return (
        <div ref={stageRef} className="lm-game" style={{ width: W * zoom, height: H * zoom }} onMouseMove={onMove}>
            <div className="lm-game__inner" style={{ width: W, height: H, transform: `scale(${ zoom })`, backgroundImage: `url(${ jungleImage })` }}>
                <LmSprite name="title_bananadrama" x={W / 2} y={70} scale={0.85} />
                <div className="lm-game__score" data-browser-text>
                    <span>{lmt('game.score', 'Score')}</span><strong>{game.score}</strong>
                    <span>{lmt('game.time', 'Time')}</span><strong>{now < START_MS ? Math.round(GAME_MS / 1000) : left} s</strong>
                    <span>{lmt('game.lives', 'Lives')}</span><strong className="lm-game__lives">{'♥'.repeat(Math.max(0, game.lives))}</strong>
                </div>
                {game.streak >= 3 && <span className="lm-game__multiplier" data-browser-text>x{Math.min(10, game.streak)}</span>}
                {game.items.filter((item) => !item.done).map((item, index) => <LmSprite key={index} name={item.bomb ? 'bomb_small' : 'bananas'} x={item.x} y={item.y} anchor="centre" scale={1.1} />)}
                <LmSprite name="crates" x={game.crate} y={CRATE_Y + 30} scale={1} />
                {game.booms.map((boom, index) => <LmSprite key={index} name={`bd_boom${ Math.min(7, Math.floor((now - boom.at) / 80)) }`} x={boom.x} y={CRATE_Y - 10} />)}
                {now < START_MS && <span className="lm-game__count" data-browser-text>{Math.ceil((START_MS - now) / 1000)}</span>}
                <span className="lm-game__help" data-browser-text>{lmt('bananadrama.help', 'Move the crate with the mouse or the arrows: catch the bananas, not the bombs!')}</span>
            </div>
        </div>
    );
};
