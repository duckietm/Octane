import { FC } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/quiz/quiz-banner.png';
import podiumImage from '../../assets/images/quiz/quiz-podiums.png';
import studioImage from '../../assets/images/quiz/quiz-studio.png';
import { MiniGameAvatar, MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import '../../css/quiz/QuizView.css';

/** A text of the quiz, `habbiquiz.<key>`. */
const qt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`habbiquiz.${key}`, fallback, parameters, replacements);

/** The studio (quiz-studio.png, deploy/scripts/quiz-art.py) is drawn at 1x and shown twice its size. */
const STAGE_W = 960;
const STAGE_H = 640;
const PODIUM_W = 112;
const PODIUM_GAP = 2;
const PODIUM_TOP = 536;
const SEATS: [number, number] = [ 2, 8 ];
const LETTERS = [ 'A', 'B', 'C', 'D' ];

interface IQuizPlayer { score: number; answered: boolean; answer: number; gained: number }

/**
 * The Habbi quiz (`habbiquiz/show`, from the Game Center): a TV studio, the players behind their podiums, the
 * question and its four answers on the big screen. Ten questions, 15 seconds each: the faster a right answer, the
 * more points. It runs on the server's tables (`/api/hall`, game `quiz`), asked for every 250 ms during a game.
 */
export const QuizView: FC = () => {
    const g = useHallGame('quiz', 'habbiquiz', 250);
    const zoom = useStageZoom(STAGE_W, STAGE_H);
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

    if (!g.visible) return null;

    const rules = qt('rules', 'Ten questions on the hotel and the world, four answers each: answer right and fast to score the most points!');
    const players = table?.players ?? [];
    const rowWidth = players.length * PODIUM_W + (players.length - 1) * PODIUM_GAP;
    const firstLeft = (STAGE_W - rowWidth) / 2;

    return (
        <NativeTextTree>
            <div className="minigame-world quiz-world">
                <div className="minigame-stage" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${zoom})` }}>
                        <img className="minigame-backdrop" src={studioImage} alt="" width={STAGE_W} height={STAGE_H} draggable={false} />

                        <div className="quiz-screen" data-browser-text>
                            {!table && <div className="quiz-screen__title">{qt('title', 'The Habbi quiz')}</div>}
                            {table && table.state === 'waiting' && <div className="quiz-screen__title">{qt('title', 'The Habbi quiz')}<span>{qt('soon', 'The show starts soon!')}</span></div>}
                            {table && table.state !== 'waiting' && (
                                <>
                                    <div className="quiz-screen__head">
                                        <span>{phase === 'intro' ? qt('ready', 'Get ready!') : qt('round', 'Question %n%/%max%', [ 'n', 'max' ], [ String(Number(board?.round) + 1), String(board?.rounds) ])}</span>
                                        {!!board?.category && phase !== 'intro' && <span className="quiz-screen__category">{String(board.category)}</span>}
                                    </div>
                                    <div className="quiz-screen__question">{phase === 'intro' ? qt('intro', '10 questions, 15 seconds each. The faster your right answer, the more points!') : String(board?.question ?? '')}</div>
                                    {phase !== 'intro' && (
                                        <div className="quiz-screen__answers">
                                            {answers.map((answer, index) => {
                                                const classes = [ 'quiz-answer', `is-${index}`, mine?.answer === index ? 'is-mine' : '', right === index ? 'is-right' : '', right >= 0 && right !== index ? 'is-dim' : '' ].join(' ');

                                                return (
                                                    <button key={index} type="button" className={classes} disabled={!canAnswer} onClick={() => g.send({ answer: index })}>
                                                        <span className="quiz-answer__letter">{LETTERS[index]}</span>
                                                        <span>{answer}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {playing && <div className="quiz-screen__timer"><span style={{ width: `${(100 * timeLeft) / total}%` }} className={phase === 'reveal' ? 'is-reveal' : timeLeft < 4000 ? 'is-hurry' : ''} /></div>}
                                </>
                            )}
                        </div>

                        {players.map((player, seat) => {
                            const score = scores[seat];
                            const lit = phase === 'reveal' && right >= 0 ? (score?.answer === right ? 1 : 2) : 0;

                            return (
                                <div key={player.userId} className={`quiz-contestant ${seat === table.you ? 'is-you' : ''}`} style={{ left: firstLeft + seat * (PODIUM_W + PODIUM_GAP), top: PODIUM_TOP }}>
                                    <MiniGameAvatar player={player} direction={3} className="quiz-contestant__avatar" />
                                    {phase === 'reveal' && score?.gained > 0 && <span className="quiz-contestant__gain" data-browser-text>+{score.gained}</span>}
                                    {phase === 'ask' && score?.answered && <span className="quiz-contestant__done" data-browser-text>{qt('answered', 'Answered!')}</span>}
                                    <span className="quiz-podium" style={{ backgroundImage: `url(${podiumImage})`, backgroundPosition: `${-lit * PODIUM_W}px 0` }}>
                                        <span className="quiz-podium__name" data-browser-text>{player.name}</span>
                                        <span className="quiz-podium__score" data-browser-text>{score?.score ?? 0}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <MiniGameTopBar game="quiz" g={g} title={qt('title', 'The Habbi quiz')}>
                    {playing && <span className="minigame-topbar__info">{phase === 'reveal' ? qt('answer', 'The answer!') : canAnswer ? qt('your_turn', 'Your answer?') : phase === 'ask' ? qt('wait', 'Waiting for the others...') : qt('ready', 'Get ready!')}</span>}
                </MiniGameTopBar>

                {table?.state === 'waiting' && <MiniGameWaiting game="quiz" g={g} table={table} seats={SEATS} className="quiz-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="quiz" g={g} className="quiz-lobby" title={qt('title', 'The Habbi quiz')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="quiz" g={g} table={table} className="quiz-results" title={qt('results', 'The scores')}
                    rows={scores.map((score, seat) => ({ seat, score: score.score }))
                        .sort((a, b) => b.score - a.score)
                        .map((row, index, rows) => ({ seat: row.seat, place: 1 + rows.findIndex((other) => other.score === row.score), detail: qt('points', '%n% points', [ 'n' ], [ String(row.score) ]) }))} />
            )}
        </NativeTextTree>
    );
};
