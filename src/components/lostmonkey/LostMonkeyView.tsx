import { AddLinkEventTracker, CreateLinkEvent, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ILostMonkeyIsland, LostMonkeyAction, LostMonkeyApi, lmt, lostMonkeyErrorText } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import mapImage from '../../assets/images/lostmonkey/lm-island-map.jpg';
import logoImage from '../../assets/images/lostmonkey/lm-logo.png';
import storyBeach from '../../assets/images/lostmonkey/lm-story-a21.jpg';
import storyHome from '../../assets/images/lostmonkey/lm-story-a23.jpg';
import storyFly from '../../assets/images/lostmonkey/lm-story-a26.jpg';
import storySpace from '../../assets/images/lostmonkey/lm-story-a30.jpg';
import { BananaDramaGame } from './BananaDramaGame';
import { JungleJamGame } from './JungleJamGame';
import { LmSprite, MonkeyPicture } from './LostMonkeySprites';
import '../../css/lostmonkey/LostMonkeyIsland.css';

/** The island (lm-island-map.jpg, the game's a12): 1024 x 1024, the things on it at their foot. */
const MAP = 1024;
const TOP_BAR = 44;
const WALK_SPEED = 170;
const MONKEY_SCALE = 0.5;

type Place = 'tree0' | 'tree1' | 'tree2' | 'tv' | 'toilet' | 'shower' | 'hammock' | 'vending' | 'rocket' | 'copywriter' | 'junglejam' | 'bananadrama';

const PLACES: Record<Place, { x: number; y: number }> = {
    tree0: { x: 330, y: 500 },
    tree1: { x: 190, y: 650 },
    tree2: { x: 650, y: 610 },
    tv: { x: 470, y: 560 },
    toilet: { x: 95, y: 470 },
    shower: { x: 330, y: 330 },
    hammock: { x: 170, y: 900 },
    vending: { x: 740, y: 370 },
    rocket: { x: 850, y: 770 },
    copywriter: { x: 560, y: 800 },
    junglejam: { x: 420, y: 930 },
    bananadrama: { x: 300, y: 790 }
};

const DECOR = [
    { name: 'parasol', x: 690, y: 960 },
    { name: 'chest', x: 930, y: 430 },
    { name: 'coconuts', x: 110, y: 720 },
    { name: 'totem', x: 640, y: 440 },
    { name: 'palm2', x: 40, y: 560 },
    { name: 'crates', x: 260, y: 470 }
];

const NEEDS: { key: 'hunger' | 'energy' | 'hygiene' | 'fun'; label: string; colour: string }[] = [
    { key: 'hunger', label: 'Hunger', colour: '#e94fe0' },
    { key: 'energy', label: 'Energy', colour: '#ff8a3c' },
    { key: 'hygiene', label: 'Hygiene', colour: '#8ee63c' },
    { key: 'fun', label: 'Fun', colour: '#38c8f2' }
];

const STORY = [
    { image: storyFly, text: 'Three, two, one... lift-off! The rocket leaves the island in a cloud of smoke!' },
    { image: storySpace, text: 'Up, up and away! Your monkey sees the whole world from up there.' },
    { image: storyHome, text: 'A soft landing... and a well-earned rest. Back to the island to build the next one!' }
];

const useZoom = (): number => {
    const read = () => Math.max(0.5, Math.min(1.1, (window.innerHeight - TOP_BAR) / MAP, window.innerWidth / MAP));
    const [ zoom, setZoom ] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return zoom;
};

/**
 * Lost Monkey (`lostmonkey/show`, from the Game Center), as Habbo's iPhone game: the monkey's island with its own
 * pictures. Click on the island to walk your monkey there; click a thing to use it: pick the banana trees, the TV,
 * the shower and the toilet, the hammock to sleep, the machine to buy bananas, the workbench where the rocket is built
 * part by part to leave the island, and the three START signs of the island's games (Jungle Jam, Banana Drama, Copy
 * Writer with others). Feed your monkey (click it) and keep his needs up. The island is kept by the server
 * (`/api/lostmonkey`).
 */
export const LostMonkeyView: FC = () => {
    const [ visible, setVisible ] = useState(false);
    const [ island, setIsland ] = useState<ILostMonkeyIsland | null>(null);
    const [ error, setError ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ monkey, setMonkey ] = useState({ x: 560, y: 680, facing: 1, walking: false });
    const [ bubble, setBubble ] = useState<{ text: string; at: number } | null>(null);
    const [ window_, setWindow ] = useState<'shop' | 'rocket' | null>(null);
    const [ game, setGame ] = useState<'junglejam' | 'bananadrama' | null>(null);
    const [ result, setResult ] = useState<{ score: number; coins: number } | null>(null);
    const [ story, setStory ] = useState(-1);
    const walkRef = useRef<{ x: number; y: number; then: (() => void) | null } | null>(null);
    const monkeyRef = useRef(monkey);
    const zoom = useZoom();

    monkeyRef.current = monkey;

    const say = (text: string) => setBubble({ text, at: performance.now() });

    const run = useCallback(async (action: LostMonkeyAction, body: Record<string, unknown> = {}, line?: string) => {
        if (busy) return null;

        setBusy(true);

        try {
            const next = await LostMonkeyApi.act(action, body);

            setIsland(next);
            if (line) say(line);

            return next;
        } catch (caught) {
            setError(lostMonkeyErrorText(caught));

            return null;
        } finally {
            setBusy(false);
        }
    }, [ busy ]);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const action = url.slice('lostmonkey/'.length).split('/')[0];

                if (action === 'show') setVisible(true);
                else if (action === 'hide') setVisible(false);
            },
            eventUrlPrefix: 'lostmonkey/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() => {
        if (!visible) return;

        const load = () => LostMonkeyApi.island().then(setIsland).catch((caught) => setError(lostMonkeyErrorText(caught)));

        load();

        const timer = setInterval(load, 20_000);

        return () => clearInterval(timer);
    }, [ visible ]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => setError(''), 4000);

        return () => clearTimeout(timer);
    }, [ error ]);

    useEffect(() => {
        if (!bubble) return;

        const timer = setTimeout(() => setBubble(null), 2600);

        return () => clearTimeout(timer);
    }, [ bubble ]);

    // The monkey walks where it is sent, then does what it was sent for.
    useEffect(() => {
        if (!visible) return;

        let frame = 0;
        let last = performance.now();
        const loop = () => {
            const now = performance.now();
            const dt = Math.min(0.05, (now - last) / 1000);
            const target = walkRef.current;

            last = now;

            if (target) {
                const current = monkeyRef.current;
                const dx = target.x - current.x;
                const dy = target.y - current.y;
                const distance = Math.hypot(dx, dy);
                const step = WALK_SPEED * dt;

                if (distance <= step) {
                    walkRef.current = null;
                    setMonkey({ x: target.x, y: target.y, facing: current.facing, walking: false });
                    target.then?.();
                } else {
                    setMonkey({ x: current.x + (dx / distance) * step, y: current.y + (dy / distance) * step, facing: dx < 0 ? -1 : 1, walking: true });
                }
            }

            frame = requestAnimationFrame(loop);
        };

        frame = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(frame);
    }, [ visible ]);

    const walkTo = (x: number, y: number, then: (() => void) | null = null) => {
        if (island?.asleep) {
            say(lmt('say.asleep', 'Zzz...'));
            return;
        }

        walkRef.current = { x: Math.max(40, Math.min(MAP - 60, x)), y: Math.max(200, Math.min(MAP - 30, y)), then };
    };

    const onMap = (event: MouseEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();

        walkTo((event.clientX - box.left) / zoom, (event.clientY - box.top) / zoom);
    };

    const startGame = async (which: 'junglejam' | 'bananadrama') => {
        const next = await run('play', { game: which });

        if (next) {
            setResult(null);
            setGame(which);
        }
    };

    const endGame = async (score: number) => {
        setGame(null);

        const next = await run('score', { score });

        setResult({ score, coins: next?.coinsWon ?? 0 });
    };

    const use = (place: Place) => {
        const spot = PLACES[place];

        walkTo(spot.x + 10, spot.y + 18, () => {
            switch (place) {
                case 'tree0':
                case 'tree1':
                case 'tree2':
                    run('harvest', { tree: Number(place.slice(4)) }, lmt('say.harvest', 'Bananas!'));
                    break;
                case 'tv':
                    run('tv', {}, lmt('say.tv', 'Ha ha ha!'));
                    break;
                case 'toilet':
                case 'shower':
                    run('wash', {}, lmt('say.wash', 'All clean!'));
                    break;
                case 'hammock':
                    run('sleep', {}, lmt('say.asleep', 'Zzz...'));
                    break;
                case 'vending':
                    setWindow('shop');
                    break;
                case 'rocket':
                    setWindow('rocket');
                    break;
                case 'copywriter':
                    setVisible(false);
                    CreateLinkEvent('lostmonkey/copywriter/show');
                    break;
                case 'junglejam':
                case 'bananadrama':
                    startGame(place);
                    break;
            }
        });
    };

    const feed = () => {
        if (!island) return;
        if (island.asleep) {
            run('wake', {}, lmt('say.wake', 'Good morning!'));
            return;
        }

        run('feed', {}, lmt('say.feed', 'Yum!'));
    };

    const launch = async () => {
        const next = await run('launch');

        if (next) {
            setWindow(null);
            setStory(0);
        }
    };

    if (!visible) return null;

    const asleep = !!island?.asleep;
    const hammock = PLACES.hammock;
    const monkeyAt = asleep ? { x: hammock.x, y: hammock.y - 30 } : monkey;
    const things: { key: string; name: string; x: number; y: number; place?: Place; label?: string }[] = [
        ...[ 0, 1, 2 ].map((tree) => ({ key: `tree${ tree }`, name: `tree${ island?.trees?.[tree] ?? 3 }`, ...PLACES[`tree${ tree }` as Place], place: `tree${ tree }` as Place, label: lmt('label.tree', 'Banana tree') })),
        { key: 'tv', name: 'tv', ...PLACES.tv, place: 'tv', label: lmt('label.tv', 'TV') },
        { key: 'toilet', name: 'toilet', ...PLACES.toilet, place: 'toilet', label: lmt('label.toilet', 'Toilet') },
        { key: 'shower', name: 'shower', ...PLACES.shower, place: 'shower', label: lmt('label.shower', 'Shower') },
        { key: 'hammock', name: 'hammock', ...PLACES.hammock, place: 'hammock', label: lmt('label.hammock', 'Hammock') },
        { key: 'vending', name: 'vending', ...PLACES.vending, place: 'vending', label: lmt('label.vending', 'Machine') },
        { key: 'rocket', name: `rocket${ Math.min(7, island?.rocket ?? 0) }`, ...PLACES.rocket, place: 'rocket', label: lmt('label.rocket', 'The rocket') },
        { key: 'copywriter', name: 'start_copywriter', ...PLACES.copywriter, place: 'copywriter', label: 'Copy Writer' },
        { key: 'junglejam', name: 'start_junglejam', ...PLACES.junglejam, place: 'junglejam', label: 'Jungle Jam' },
        { key: 'bananadrama', name: 'start_bananadrama', ...PLACES.bananadrama, place: 'bananadrama', label: 'Banana Drama' },
        ...DECOR.map((item) => ({ key: item.name, ...item }))
    ];
    const gameZoom = Math.min(1.5, (window.innerHeight - TOP_BAR) / 640, window.innerWidth / 960);

    return (
        <NativeTextTree>
            <div className="minigame-world lm-island-world">
                <div className="lm-island" style={{ width: MAP * zoom, height: MAP * zoom }}>
                    <div className="lm-island__inner" style={{ width: MAP, height: MAP, transform: `scale(${ zoom })` }} onClick={onMap}>
                        <img className="lm-island__map" src={mapImage} alt="" width={MAP} height={MAP} draggable={false} />
                        {things.map((thing) => (
                            <div key={thing.key} className={`lm-thing ${ thing.place ? 'is-usable' : '' }`} style={{ left: thing.x, top: thing.y, zIndex: Math.round(thing.y) }} onClick={thing.place ? (event) => {
                                event.stopPropagation();
                                use(thing.place as Place);
                            } : undefined}>
                                <LmSprite name={thing.name} />
                                {thing.label && <span className="lm-thing__label" data-browser-text>{thing.label}</span>}
                            </div>
                        ))}
                        <div className={`lm-monkey ${ monkey.walking && !asleep ? 'is-walking' : '' } ${ asleep ? 'is-asleep' : '' }`} style={{ left: monkeyAt.x, top: monkeyAt.y, zIndex: Math.round(monkeyAt.y) + 2 }} onClick={(event) => {
                            event.stopPropagation();
                            feed();
                        }}>
                            <MonkeyPicture colour={island?.colour ?? 0} asleep={asleep || (island?.energy ?? 100) < 15} scale={MONKEY_SCALE} style={{ transform: `scaleX(${ monkey.facing })` }} />
                            {bubble && <span className="lm-monkey__bubble" data-browser-text>{bubble.text}</span>}
                        </div>
                    </div>
                </div>

                <div className="minigame-topbar lm-topbar" data-browser-text>
                    <Button variant="danger" onClick={() => setVisible(false)}>{lmt('leave', 'Leave the island')}</Button>
                    <img className="lm-topbar__logo" src={logoImage} alt="Lost Monkey" />
                    {island && <span className="minigame-topbar__info">{lmt('games_left', 'Island games left today: %n%', [ 'n' ], [ island.gamesLeft < 0 ? '∞' : String(island.gamesLeft) ])}</span>}
                </div>

                {island && (
                    <div className="lm-hud" data-browser-text>
                        <div className="lm-hud__head">
                            <MonkeyPicture colour={island.colour} asleep={asleep} scale={0.36} />
                            <div className="lm-hud__mood">
                                <LmSprite name={`mood${ island.mood }`} anchor="none" style={{ position: 'relative' }} />
                                <span>{lmt(`mood.${ island.mood }`, [ 'Very happy', 'Happy', 'So-so', 'Sad', 'Miserable' ][island.mood])}</span>
                            </div>
                        </div>
                        {NEEDS.map((need, index) => (
                            <div key={need.key} className="lm-need">
                                <span className="lm-need__fill" style={{ width: `${ Math.round(island[need.key]) * 0.8 }%`, background: need.colour }} />
                                <LmSprite name={`bar${ index }`} anchor="none" style={{ position: 'relative' }} />
                                <span className="lm-need__label">{lmt(`need.${ need.key }`, need.label)}</span>
                            </div>
                        ))}
                        <div className="lm-hud__stock">
                            <span><LmSprite name="bananas" anchor="none" scale={0.6} style={{ position: 'relative' }} /><b>{island.bananas}</b></span>
                            <span><LmSprite name="chest_small" anchor="none" scale={0.6} style={{ position: 'relative' }} /><b>{island.coins}</b></span>
                        </div>
                        <Button variant="success" disabled={busy || (!asleep && island.bananas <= 0)} onClick={feed}>{asleep ? lmt('wake', 'Wake him up') : lmt('feed', 'Give a banana')}</Button>
                        <div className="lm-hud__colours">
                            {Array.from({ length: 9 }, (_, colour) => (
                                <button key={colour} type="button" className={`lm-hud__colour ${ colour === island.colour ? 'is-on' : '' }`} onClick={() => run('colour', { colour })}>
                                    <MonkeyPicture colour={colour} scale={0.16} />
                                </button>
                            ))}
                        </div>
                        <span className="lm-hud__hint">{lmt('hint', 'Click the island to walk, a thing to use it, your monkey to feed him.')}</span>
                    </div>
                )}

                {game && (
                    <div className="lm-game-layer">
                        {game === 'junglejam' && <JungleJamGame zoom={gameZoom} onEnd={endGame} />}
                        {game === 'bananadrama' && <BananaDramaGame zoom={gameZoom} onEnd={endGame} />}
                    </div>
                )}

                {story >= 0 && (
                    <div className="lm-story" onClick={() => setStory(story + 1 < STORY.length ? story + 1 : -1)}>
                        <img src={STORY[story].image} alt="" draggable={false} />
                        <span data-browser-text>{lmt(`story.${ story }`, STORY[story].text)}</span>
                        <em data-browser-text>{lmt('story.next', 'Click to continue')}</em>
                    </div>
                )}

                {error && <div className="minigame-toast" data-browser-text>{error}</div>}
            </div>

            {window_ === 'shop' && island && (
                <OctaneCardView className="game-window lm-window" data-game-theme="copywriter" theme="primary-slim" uniqueKey="lostmonkey-shop" isResizable={false}>
                    <OctaneCardHeaderView headerText={lmt('shop.title', 'The vending machine')} onCloseClick={() => setWindow(null)} />
                    <OctaneCardContentView className="lm-window__content" gap={2}>
                        <div className="lm-window__row" data-browser-text>
                            <LmSprite name="vending" anchor="none" scale={0.8} style={{ position: 'relative' }} />
                            <span>{lmt('shop.text', 'Bananas for your monkey, %p% coins each. You have %c% coins.', [ 'p', 'c' ], [ String(island.bananaPrice), String(island.coins) ])}</span>
                        </div>
                        <div className="lm-window__buttons">
                            {[ 1, 5, 10 ].map((count) => (
                                <Button key={count} variant="success" disabled={busy || island.coins < count * island.bananaPrice} onClick={() => run('bananas', { count }, lmt('say.bought', 'Thanks!'))}>
                                    {lmt('shop.buy', '%n% bananas (%p% coins)', [ 'n', 'p' ], [ String(count), String(count * island.bananaPrice) ])}
                                </Button>
                            ))}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {window_ === 'rocket' && island && (
                <OctaneCardView className="game-window lm-window" data-game-theme="copywriter" theme="primary-slim" uniqueKey="lostmonkey-rocket" isResizable={false}>
                    <OctaneCardHeaderView headerText={lmt('rocket.title', 'The rocket')} onCloseClick={() => setWindow(null)} />
                    <OctaneCardContentView className="lm-window__content" gap={2}>
                        <div className="lm-window__row" data-browser-text>
                            <LmSprite name={`rocket${ Math.min(7, island.rocket) }`} anchor="none" style={{ position: 'relative' }} />
                            <span>
                                {island.rocket >= island.rocketReady
                                    ? lmt('rocket.ready', 'The rocket is ready! Launch it to see the world (and win %n% coins).', [ 'n' ], [ '100' ])
                                    : lmt('rocket.text', 'Build the rocket part by part to leave the island. Parts built: %b%/%t%.', [ 'b', 't' ], [ String(island.rocket), String(island.rocketReady) ])}
                                {island.launches > 0 && <em className="lm-window__note">{lmt('rocket.launches', 'Rockets launched: %n%', [ 'n' ], [ String(island.launches) ])}</em>}
                            </span>
                        </div>
                        <div className="lm-rocket-steps">
                            {Array.from({ length: island.rocketReady }, (_, part) => <span key={part} className={part < island.rocket ? 'is-done' : ''} />)}
                        </div>
                        <div className="lm-window__buttons">
                            {island.rocket < island.rocketReady
                                ? <Button variant="success" disabled={busy || island.coins < island.parts[island.rocket]} onClick={() => run('build', {}, lmt('say.build', 'One more part!'))}>{lmt('rocket.build', 'Build the next part (%p% coins)', [ 'p' ], [ String(island.parts[island.rocket]) ])}</Button>
                                : <Button variant="success" disabled={busy} onClick={launch}>{lmt('rocket.launch', 'Launch!')}</Button>}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {result && (
                <OctaneCardView className="game-window lm-window" data-game-theme="copywriter" theme="primary-slim" uniqueKey="lostmonkey-result" isResizable={false}>
                    <OctaneCardHeaderView headerText={lmt('result.title', 'End of the game')} onCloseClick={() => setResult(null)} />
                    <OctaneCardContentView className="lm-window__content" gap={2}>
                        <div className="lm-window__row" data-browser-text>
                            <LmSprite name="chest" anchor="none" style={{ position: 'relative' }} />
                            <span>{lmt('result.text', 'Score: %s%. Your monkey wins %c% coins!', [ 's', 'c' ], [ String(result.score), String(result.coins) ])}</span>
                        </div>
                        <div className="lm-window__buttons">
                            <Button variant="success" onClick={() => setResult(null)}>{lmt('result.ok', 'Back to the island')}</Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </NativeTextTree>
    );
};

/** The story picture of a new island (the monkey on the beach), for the card. */
export const LOST_MONKEY_BEACH = storyBeach;
