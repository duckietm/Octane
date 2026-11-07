import { FC, useCallback, useEffect, useState } from 'react';
import { GameCenterApi, GameLeaderboardScope, GetGroupInformation, GetSessionDataManager, GetUserProfile, IGameLeaderboard, gct } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { LayoutAvatarImageView, LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';

const PAGE = 8;

/**
 * A game's leaderboard, in the game's colours: this week (and the weeks before) or of all time; everybody, the
 * player's friends, or the groups (their members' points, by favourite group). Your row is lit; a head opens the
 * profile, a badge the group.
 */
export const GameLeaderboardView: FC<{ game: string; title: string; onClose: () => void }> = ({ game, title, onClose }) => {
    const [ weekly, setWeekly ] = useState(true);
    const [ scope, setScope ] = useState<GameLeaderboardScope>('everyone');
    const [ week, setWeek ] = useState(0);
    const [ board, setBoard ] = useState<IGameLeaderboard | null>(null);
    const [ page, setPage ] = useState(0);
    const [ loading, setLoading ] = useState(false);
    const ownId = GetSessionDataManager()?.userId ?? 0;

    const load = useCallback(() => {
        setLoading(true);
        GameCenterApi.leaderboard(game, weekly, scope, week)
            .then((next) => {
                setBoard(next);
                setPage(0);
            })
            .catch(() => setBoard(null))
            .finally(() => setLoading(false));
    }, [ game, weekly, scope, week ]);

    useEffect(() => load(), [ load ]);

    const entries = board?.entries ?? [];
    const highlight = scope === 'groups' ? board?.favouriteGroupId ?? 0 : ownId;
    const rows = entries.slice(page * PAGE, page * PAGE + PAGE);
    const minutes = board?.minutesUntilReset ?? 0;
    const pastWeek = weekly && week > 0;

    return (
        <OctaneCardView className="game-window game-leaderboard" data-game-theme={game} theme="primary-slim" uniqueKey={`leaderboard-${ game }`} isResizable={false}>
            <OctaneCardHeaderView headerText={gct('leaderboard.title', '%game%: leaderboard', [ 'game' ], [ title ])} onCloseClick={onClose} />
            <OctaneCardContentView className="game-leaderboard__content" gap={2}>
                <div className="game-leaderboard__tabs" data-browser-text>
                    <BaseButton className={`game-leaderboard__tab ${ weekly ? 'is-active' : '' }`} type="button" onClick={() => {
                        setWeekly(true);
                        setWeek(0);
                    }}>{pastWeek ? gct('leaderboard.week_of', 'Week %w% of %y%', [ 'w', 'y' ], [ String(board?.week ?? ''), String(board?.year ?? '') ]) : gct('leaderboard.this_week', 'This week')}</BaseButton>
                    <BaseButton className={`game-leaderboard__tab ${ !weekly ? 'is-active' : '' }`} type="button" onClick={() => setWeekly(false)}>{gct('leaderboard.all_time', 'All time')}</BaseButton>
                </div>
                <div className="game-leaderboard__scopes" data-browser-text>
                    {([ [ 'everyone', 'Everybody' ], [ 'friends', 'My friends' ], [ 'groups', 'Groups' ] ] as [ GameLeaderboardScope, string ][]).map(([ value, label ]) => (
                        <BaseButton key={value} className={`game-leaderboard__scope ${ scope === value ? 'is-active' : '' }`} type="button" onClick={() => setScope(value)}>{gct(`leaderboard.${ value }`, label)}</BaseButton>
                    ))}
                </div>
                <div className="game-leaderboard__list">
                    {loading && <div className="game-leaderboard__empty" data-browser-text>{gct('leaderboard.loading', 'Loading...')}</div>}
                    {!loading && !rows.length && <div className="game-leaderboard__empty" data-browser-text>{gct('leaderboard.empty', 'No score yet: play a game to be the first!')}</div>}
                    {!loading && rows.map((entry) => {
                        const group = entry.gender === 'g';
                        const own = entry.id === highlight;

                        return (
                            <div key={`${ entry.id }-${ entry.rank }`} className={`game-leaderboard__row ${ own ? 'is-own' : '' } ${ entry.rank <= 3 ? `is-top is-top-${ entry.rank }` : '' }`}>
                                <span className="game-leaderboard__rank" data-browser-text>{entry.rank}</span>
                                <BaseButton className="game-leaderboard__head" type="button" onClick={() => (group ? GetGroupInformation(entry.id) : GetUserProfile(entry.id))}>
                                    {group
                                        ? <LayoutBadgeImageView badgeCode={entry.figure} isGroup={true} />
                                        : <LayoutAvatarImageView direction={2} figure={entry.figure} gender={entry.gender} headOnly={true} />}
                                </BaseButton>
                                <span className="game-leaderboard__name" data-browser-text>{entry.name}</span>
                                <span className="game-leaderboard__score" data-browser-text>{entry.score}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="game-leaderboard__foot" data-browser-text>
                    <span className="game-leaderboard__pages">
                        <BaseButton className="game-leaderboard__arrow" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>&lsaquo;</BaseButton>
                        <BaseButton className="game-leaderboard__arrow" type="button" disabled={(page + 1) * PAGE >= entries.length} onClick={() => setPage(page + 1)}>&rsaquo;</BaseButton>
                    </span>
                    {weekly && (
                        <span className="game-leaderboard__weeks">
                            <BaseButton className="game-leaderboard__week" type="button" disabled={week >= (board?.maxOffset ?? 0)} onClick={() => setWeek(week + 1)}>{gct('leaderboard.previous_week', '« Week before')}</BaseButton>
                            {pastWeek && <BaseButton className="game-leaderboard__week" type="button" onClick={() => setWeek(week - 1)}>{gct('leaderboard.next_week', 'Week after »')}</BaseButton>}
                        </span>
                    )}
                    {weekly && !pastWeek && (
                        <span className="game-leaderboard__reset">
                            {gct('leaderboard.reset', 'New week in %d%d %h%h %m%m', [ 'd', 'h', 'm' ], [ String(Math.floor(minutes / 1440)), String(Math.floor((minutes % 1440) / 60)), String(minutes % 60) ])}
                        </span>
                    )}
                </div>
                <div className="game-leaderboard__hint" data-browser-text>{gct('leaderboard.points', 'A win is worth 10 points, a game played 2.')}</div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
