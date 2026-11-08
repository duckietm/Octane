import { CSSProperties, FC, useCallback, useEffect, useState } from 'react';
import { GameCenterApi, GameLeaderboardScope, GetGroupInformation, GetSessionDataManager, GetUserProfile, IGameLeaderboard, gct } from '../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../assets/images/snowstorm/air';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { gameLeaderboardBackground } from './GameCenterArt';

const PAGE = 8;

const asset = (name: string) => SNOWWAR_AIR_ASSETS[name] ?? '';

const scrollImages = (direction: 'up' | 'down'): CSSProperties => ({
    '--scroll-normal': `url(${ asset(`scroll_${ direction }_normal`) })`,
    '--scroll-hilite': `url(${ asset(`scroll_${ direction }_hilite`) })`,
    '--scroll-click': `url(${ asset(`scroll_${ direction }_click`) })`
} as CSSProperties);

/**
 * A game's leaderboard, laid out as SnowStorm's (the frame, This week / All time, eight rows of 42 px with your row on
 * the highlighter, the scroll arrows, the week arrows and the reset time, the Everybody / Friends / Groups links) on
 * a background of the game's colours with its emblem. A head opens the profile, a badge the group.
 */
export const GameLeaderboardView: FC<{ game: string; title: string; onClose: () => void }> = ({ game, title, onClose }) => {
    const [ weekly, setWeekly ] = useState(true);
    const [ scope, setScope ] = useState<GameLeaderboardScope>('everyone');
    const [ week, setWeek ] = useState(0);
    const [ board, setBoard ] = useState<IGameLeaderboard | null>(null);
    const [ offset, setOffset ] = useState(0);
    const [ loading, setLoading ] = useState(false);
    const ownId = GetSessionDataManager()?.userId ?? 0;

    const load = useCallback(() => {
        setLoading(true);
        GameCenterApi.leaderboard(game, weekly, scope, week)
            .then((next) => {
                setBoard(next);
                setOffset(0);
            })
            .catch(() => setBoard(null))
            .finally(() => setLoading(false));
    }, [ game, weekly, scope, week ]);

    useEffect(() => load(), [ load ]);

    const entries = board?.entries ?? [];
    const highlight = scope === 'groups' ? board?.favouriteGroupId ?? 0 : ownId;
    const rows = entries.slice(offset, offset + PAGE);
    const minutes = board?.minutesUntilReset ?? 0;
    const pastWeek = weekly && week > 0;
    const caption = scope === 'friends' ? gct('leaderboard.friends_caption', 'Friends scores') : gct('leaderboard.caption', '%game%: top scores', [ 'game' ], [ title ]);

    return (
        <NativeTextTree>
            <div className="snowwar-leaderboard-overlay game-leaderboard-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
                <div className="snowwar-leaderboard-frame game-leaderboard-frame" data-game-theme={game} role="dialog" aria-label={caption}>
                    <div className="snowwar-leaderboard-frame__title">
                        <span>{caption}</span>
                        <BaseButton aria-label={gct('close', 'Close')} className="snowwar-leaderboard__close" type="button" onClick={onClose}>×</BaseButton>
                    </div>
                    <div className="snowwar-leaderboard game-leaderboard-board" style={{ backgroundImage: `url(${ gameLeaderboardBackground(game) })` }}>
                        <div className="snowwar-leaderboard__tabs" data-browser-text>
                            <BaseButton className={`snowwar-leaderboard__tab game-leaderboard__tab is-left ${ weekly ? 'is-active' : '' }`} type="button" onClick={() => {
                                setWeekly(true);
                                setWeek(0);
                            }}>
                                {pastWeek ? `${ board?.year ?? '' }/${ board?.week ?? '' }` : gct('leaderboard.this_week', 'This week')}
                            </BaseButton>
                            <BaseButton className={`snowwar-leaderboard__tab game-leaderboard__tab is-right ${ !weekly ? 'is-active' : '' }`} type="button" onClick={() => setWeekly(false)}>
                                {gct('leaderboard.all_time', 'All time')}
                            </BaseButton>
                        </div>

                        {offset > 0 && <BaseButton aria-label="Scroll up" className="snowwar-leaderboard__scroll snowwar-leaderboard__scroll--up" style={scrollImages('up')} type="button" onClick={() => setOffset(Math.max(0, offset - PAGE))} />}

                        <div className="snowwar-leaderboard__list">
                            {loading && <div className="snowwar-leaderboard__empty" data-browser-text>{gct('leaderboard.loading', 'Loading...')}</div>}
                            {!loading && !rows.length && <div className="snowwar-leaderboard__empty" data-browser-text>{gct('leaderboard.empty', 'No score yet: play a game to be the first!')}</div>}
                            {!loading && rows.map((entry) => {
                                const group = entry.gender === 'g';
                                const own = entry.id === highlight;

                                return (
                                    <div key={`${ entry.id }-${ entry.rank }`} className={`snowwar-leaderboard__row ${ own ? 'is-own' : '' }`}>
                                        {own && <span className="snowwar-leaderboard__highlight game-leaderboard__highlight" />}
                                        <span className="snowwar-leaderboard__rank">{entry.rank}</span>
                                        <BaseButton className="snowwar-leaderboard__avatar" type="button" onClick={() => (group ? GetGroupInformation(entry.id) : GetUserProfile(entry.id))}>
                                            {group
                                                ? <LayoutBadgeImageView badgeCode={entry.figure} isGroup={true} />
                                                : <LayoutAvatarImageView direction={2} figure={entry.figure} gender={entry.gender} headOnly={true} />}
                                        </BaseButton>
                                        <span className="snowwar-leaderboard__name">{entry.name}</span>
                                        <span className="snowwar-leaderboard__score">{entry.score}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {offset + PAGE < entries.length && <BaseButton aria-label="Scroll down" className="snowwar-leaderboard__scroll snowwar-leaderboard__scroll--down" style={scrollImages('down')} type="button" onClick={() => setOffset(offset + PAGE)} />}

                        {weekly && (
                            <>
                                {week < (board?.maxOffset ?? 0) && <BaseButton aria-label="Previous week" className="snowwar-leaderboard__week snowwar-leaderboard__week--previous" style={{ backgroundImage: `url(${ asset('scroll_left') })` }} type="button" onClick={() => setWeek(week + 1)} />}
                                {pastWeek && <BaseButton aria-label="Next week" className="snowwar-leaderboard__week snowwar-leaderboard__week--next" style={{ backgroundImage: `url(${ asset('scroll_right') })` }} type="button" onClick={() => setWeek(week - 1)} />}
                                {!pastWeek && (
                                    <div className="snowwar-leaderboard__reset game-leaderboard__reset" data-browser-text>
                                        {gct('leaderboard.reset', 'Reset: %d%d %h%h %m%m', [ 'd', 'h', 'm' ], [ String(Math.floor(minutes / 1440)), String(Math.floor((minutes % 1440) / 60)), String(minutes % 60) ])}
                                    </div>
                                )}
                            </>
                        )}

                        <div className="game-leaderboard__points" data-browser-text>{gct('leaderboard.points', 'A win is worth 10 points, a game played 2.')}</div>

                        <div className="snowwar-leaderboard__links" data-browser-text>
                            {([ [ 'everyone', 'Everybody' ], [ 'friends', 'My friends' ], [ 'groups', 'Groups' ] ] as [ GameLeaderboardScope, string ][]).map(([ value, label ]) => (
                                <BaseButton key={value} className={`snowwar-leaderboard__link ${ scope === value ? 'is-active' : '' }`} type="button" onClick={() => setScope(value)}>{gct(`leaderboard.${ value }`, label)}</BaseButton>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
