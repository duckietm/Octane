import { FC, useMemo } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import roomImage from '../../assets/images/gamerooms/quiz-room.png';
import bannerImage from '../../assets/images/quiz/quiz-banner.png';
import { GameRoomScene, IRoomAvatar, IRoomFurni, ROOM_H, ROOM_W } from '../minigame/GameRoomScene';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import '../../css/quiz/QuizView.css';

/** A text of the quiz, `hotelquiz.<key>`. */
const qt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`hotelquiz.${ key }`, fallback, parameters, replacements);

const SEATS: [number, number] = [ 2, 8 ];
const LETTERS = [ 'A', 'B', 'C', 'D' ];
/** The show's host, a robot of the hotel. */
const HOST_FIGURE = 'hr-893-45.hd-180-1.ch-3030-1408.lg-275-110.sh-290-110.ha-1003-1408';

/** The studio's furni: the cameras, the lights, the director's desk, the audience, the "On air" sign. */
const STUDIO: IRoomFurni[] = [
    { name: 'stories_oldmusic_neon', x: 6, y: 0, dir: 4, size: 2, sizeY: 1, lift: 60 },
    { name: 'studio_lights1', x: 0, y: 3, dir: 2 },
    { name: 'studio_lights2', x: 13, y: 0, dir: 4 },
    { name: 'studio_lights3', x: 0, y: 8, dir: 2 },
    { name: 'theatre_spotlight', x: 13, y: 7, dir: 6 },
    { name: 'studio_camera', x: 4, y: 9, dir: 0 },
    { name: 'studio_camera', x: 10, y: 9, dir: 0 },
    { name: 'studio_monitor', x: 13, y: 9, dir: 6 },
    { name: 'studio_mixingdesk', x: 0, y: 9, dir: 0, size: 1 },
    { name: 'studio_chair', x: 6, y: 9, dir: 0 },
    { name: 'studio_chair', x: 7, y: 9, dir: 0 },
    { name: 'studio_chair', x: 8, y: 9, dir: 0 }
];

interface IQuizPlayer { score: number; answered: boolean; answer: number; gained: number }

/**
 * The hotel quiz (`hotelquiz/show`, from the Game Center), in a TV studio of the hotel: the contestants as their
 * avatars behind the hotel's lecterns, the host, the cameras and lights, and the question on the big screen hanging
 * over the stage. Ten questions, 15 seconds each: the faster a right answer, the more points. It runs on the server's
 * tables (`/api/hall`, game `quiz`), asked for every 250 ms during a game.
 */
export const QuizView: FC = () => {
    const g = useHallGame('quiz', 'hotelquiz', 250);
    const zoom = useStageZoom(ROOM_W, ROOM_H);
    const table = g.table;
    const board = table?.board;
    const playing = table?.state === 'playing';
    const answers = (board?.answers as string[]) ?? [];
    const scores = (board?.players as IQuizPlayer[]) ?? [];
    const phase = String(board?.phase ?? 'intro');
    const right = Number(board?.right ?? -1);
    const mine = table ? scores[table.you] : undefined;
    const now = performance.now() - g.receivedRef.current;
    const timeLeft = Math.max(0, Number(board?.timeLeft ?? 0) - now);
    const total = phase === 'ask' ? 15000 : phase === 'reveal' ? 4000 : 3000;
    const canAnswer = playing && phase === 'ask' && !!mine && !mine.answered;
    const players = table?.players ?? [];
    const spacing = Math.min(1.45, 10.5 / Math.max(1, players.length));
    const first = 7 - (spacing * (players.length - 1)) / 2;

    const furni = useMemo<IRoomFurni[]>(() => [
        ...STUDIO,
        ...players.map((player, seat) => ({ name: 'uni_lectern', x: first + seat * spacing - 0.5, y: 5.2, dir: 4 }))
    ], [ players.length ]);

    const hostLine = !table ? qt('host.welcome', 'Welcome to the hotel quiz!')
        : table.state === 'waiting' ? qt('host.waiting', 'Contestants, take your places!')
            : table.state === 'finished' ? qt('host.end', 'What a show! Thank you all!')
                : phase === 'intro' ? qt('host.intro', 'Here is the first question...')
                    : phase === 'reveal' ? qt('host.reveal', 'The right answer was %l%!', [ 'l' ], [ LETTERS[right] ?? '?' ])
                        : qt('host.ask', 'Question %n%!', [ 'n' ], [ String(Number(board?.round) + 1) ]);

    const avatars: IRoomAvatar[] = [
        { key: 'host', figure: HOST_FIGURE, gender: 'M', x: 12.6, y: 6.6, dir: 6, name: qt('host.name', 'The host'), bubble: hostLine },
        ...players.map((player, seat) => {
            const score = scores[seat];

            return {
                key: player.userId,
                figure: player.figure,
                gender: player.gender,
                x: first + seat * spacing - 0.5,
                y: 4.2,
                dir: 4,
                name: player.name,
                you: seat === table?.you,
                sign: phase === 'reveal' && right >= 0 && score ? (score.answer === right ? 15 : -1) : -1,
                above: (
                    <span className={`quiz-tag ${ phase === 'reveal' && score?.gained > 0 ? 'is-gain' : '' } ${ phase === 'ask' && score?.answered ? 'is-answered' : '' }`}>
                        {phase === 'reveal' && score?.gained > 0 ? `+${ score.gained }` : phase === 'ask' && score?.answered ? '✓' : (score?.score ?? 0)}
                    </span>
                )
            };
        })
    ];

    if (!g.visible) return null;

    const rules = qt('rules', 'Ten questions on the hotel and the world, four answers each: answer right and fast to score the most points!');

    return (
        <NativeTextTree>
            <div className="minigame-world quiz-world">
                <div className="minigame-stage" style={{ width: ROOM_W * zoom, height: ROOM_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: ROOM_W, height: ROOM_H, transform: `scale(${ zoom })` }}>
                        <GameRoomScene image={roomImage} furni={furni} avatars={avatars}>
                            <div className="quiz-screen" data-browser-text>
                                <span className="quiz-screen__cable is-left" />
                                <span className="quiz-screen__cable is-right" />
                                {(!table || table.state === 'waiting') && <div className="quiz-screen__title">{qt('title', 'The hotel quiz')}<span>{qt('soon', 'The show starts soon!')}</span></div>}
                                {table && table.state !== 'waiting' && (
                                    <>
                                        <div className="quiz-screen__head">
                                            <span>{phase === 'intro' ? qt('ready', 'Get ready!') : qt('round', 'Question %n%/%max%', [ 'n', 'max' ], [ String(Number(board?.round) + 1), String(board?.rounds) ])}</span>
                                            {!!board?.category && phase !== 'intro' && <span className="quiz-screen__category">{String(board.category)}</span>}
                                        </div>
                                        <div className="quiz-screen__question">{phase === 'intro' ? qt('intro', '10 questions, 15 seconds each. The faster your right answer, the more points!') : String(board?.question ?? '')}</div>
                                        {phase !== 'intro' && (
                                            <div className="quiz-screen__answers">
                                                {answers.map((answer, index) => (
                                                    <span key={index} className={`quiz-screen__answer is-${ index } ${ right === index ? 'is-right' : '' } ${ right >= 0 && right !== index ? 'is-dim' : '' }`}>
                                                        <b>{LETTERS[index]}</b>{answer}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {playing && <div className="quiz-screen__timer"><span style={{ width: `${ (100 * timeLeft) / total }%` }} className={phase === 'reveal' ? 'is-reveal' : timeLeft < 4000 ? 'is-hurry' : ''} /></div>}
                                    </>
                                )}
                            </div>
                        </GameRoomScene>
                    </div>
                </div>

                <MiniGameTopBar game="quiz" g={g} title={qt('title', 'The hotel quiz')}>
                    {playing && <span className="minigame-topbar__info">{phase === 'reveal' ? qt('answer', 'The answer!') : canAnswer ? qt('your_turn', 'Your answer?') : phase === 'ask' ? qt('wait', 'Waiting for the others...') : qt('ready', 'Get ready!')}</span>}
                </MiniGameTopBar>

                {playing && phase !== 'intro' && mine && (
                    <div className="quiz-buzzers" data-browser-text>
                        {answers.map((answer, index) => (
                            <button key={index} type="button" className={`quiz-buzzer is-${ index } ${ mine.answer === index ? 'is-mine' : '' } ${ right === index ? 'is-right' : '' } ${ right >= 0 && right !== index ? 'is-dim' : '' }`} disabled={!canAnswer} onClick={() => g.send({ answer: index })}>
                                <span className="quiz-buzzer__letter">{LETTERS[index]}</span>
                                <span className="quiz-buzzer__text">{answer}</span>
                            </button>
                        ))}
                    </div>
                )}

                {table?.state === 'waiting' && <MiniGameWaiting game="quiz" g={g} table={table} seats={SEATS} className="quiz-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="quiz" g={g} className="quiz-lobby" title={qt('title', 'The hotel quiz')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="quiz" g={g} table={table} className="quiz-results" title={qt('results', 'The scores')}
                    rows={scores.map((score, seat) => ({ seat, score: score.score }))
                        .sort((a, b) => b.score - a.score)
                        .map((row, index, rows) => ({ seat: row.seat, place: 1 + rows.findIndex((other) => other.score === row.score), detail: qt('points', '%n% points', [ 'n' ], [ String(row.score) ]) }))} />
            )}
        </NativeTextTree>
    );
};
