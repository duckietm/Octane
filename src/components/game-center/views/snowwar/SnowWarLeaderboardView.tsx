import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { GetGroupInformation, getLeaderboardRows, getLeaderboardTarget, GetSessionDataManager, GetUserProfile, LocalizeText, SnowWarLeaderboardAction } from '../../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../../assets/images/snowstorm/air';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { useSnowWar } from '../../../../hooks';
import { SnowWarStrokeText } from './SnowWarStrokeText';

// AIR viewSize: eight 42px rows in the 336px list.
const PAGE_SIZE = 8;

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

const asset = (name: string) => SNOWWAR_AIR_ASSETS[name] ?? '';

/** AIR scroll_up_/scroll_down_ normal / hilite / click bitmaps as CSS variables. */
const scrollImages = (direction: 'up' | 'down'): CSSProperties => ({
    '--scroll-normal': `url(${ asset(`scroll_${ direction }_normal`) })`,
    '--scroll-hilite': `url(${ asset(`scroll_${ direction }_hilite`) })`,
    '--scroll-click': `url(${ asset(`scroll_${ direction }_click`) })`
} as CSSProperties);

/**
 * AIR LeaderboardViewController (snowwar_leaderboard): a framed window with
 * the "Top Scores" / "Friends Scores" caption, the This week / All-time tabs
 * (selected tab: black bitmap, white text), the eight-row list with your own
 * row (or your favourite group) on the highlighter, scroll arrows that only
 * show when there is more to see, the older / newer week arrows, the weekly
 * reset time, and the Everyone / Friends / Groups links. A head opens the
 * profile, a group badge the group.
 */
export const SnowWarLeaderboardView: FC = () =>
{
    const { leaderboard, requestLeaderboard, closeLeaderboard } = useSnowWar();
    const [ rowOffset, setRowOffset ] = useState(0);
    const [ clock, setClock ] = useState(() => Date.now());
    const ownUserId = GetSessionDataManager()?.userId ?? 0;

    useEffect(() =>
    {
        const reset = setTimeout(() => setRowOffset(0), 0);

        return () => clearTimeout(reset);
    }, [ leaderboard.weekly, leaderboard.friendsOnly, leaderboard.groups, leaderboard.currentOffset ]);

    // AIR startWeeklyResetTimer: the reset time counts down once a minute.
    useEffect(() =>
    {
        if (!leaderboard.weekly) return;
        const tick = () => setClock(Date.now());
        const interval = setInterval(tick, 60000);
        document.addEventListener('visibilitychange', tick);
        return () =>
        {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [ leaderboard.weekly ]);

    const highlightId = leaderboard.groups ? leaderboard.favouriteGroupId : ownUserId;
    const rows = useMemo(
        () => getLeaderboardRows(leaderboard.entries, rowOffset, PAGE_SIZE, highlightId, !leaderboard.friendsOnly),
        [ leaderboard.entries, rowOffset, highlightId, leaderboard.friendsOnly ]);

    const resetDeadline = useMemo(() => Date.now() + (leaderboard.minutesUntilReset * 60000), [ leaderboard.minutesUntilReset ]);
    const minutesLeft = Math.max(0, Math.ceil((resetDeadline - clock) / 60000));
    const canScrollUp = rowOffset > 0;
    const canScrollDown = (rowOffset + PAGE_SIZE) < leaderboard.entries.length;
    const pastWeek = leaderboard.weekly && (leaderboard.currentOffset > 0);

    if (!leaderboard.isOpen) return null;

    const go = (action: SnowWarLeaderboardAction) =>
    {
        const target = getLeaderboardTarget(action, leaderboard);
        requestLeaderboard(target.weekly, target.friendsOnly, 0, target.groups);
    };
    const goWeek = (weekOffset: number) => requestLeaderboard(true, leaderboard.friendsOnly, weekOffset, leaderboard.groups);

    const caption = leaderboard.friendsOnly
        ? localizeWithFallback('snowwar.leaderboard.friends', 'Friends Scores')
        : localizeWithFallback('snowwar.leaderboard.all', 'Top Scores');

    return (
        <div className="snowwar-leaderboard-overlay">
            <div className="snowwar-leaderboard-frame" role="dialog" aria-label={ caption }>
                <div className="snowwar-leaderboard-frame__title">
                    <span>{ caption }</span>
                    <button aria-label={ localizeWithFallback('generic.close', 'Close') } className="snowwar-leaderboard__close" type="button" onClick={ closeLeaderboard }>×</button>
                </div>
                <div className="snowwar-leaderboard" style={ { backgroundImage: `url(${ asset('leaderboard_bg') })` } }>
                    <div className="snowwar-leaderboard__tabs">
                        <button
                            className={ `snowwar-leaderboard__tab ${ leaderboard.weekly ? 'is-active' : '' }` }
                            style={ { backgroundImage: `url(${ asset(leaderboard.weekly ? 'left_black' : 'left_blue') })` } }
                            type="button"
                            onClick={ () => go('this_week') }>
                            { pastWeek ? `${ leaderboard.year }/${ leaderboard.week }` : localizeWithFallback('snowwar.leaderboard.this_week', 'This week') }
                        </button>
                        <button
                            className={ `snowwar-leaderboard__tab ${ !leaderboard.weekly ? 'is-active' : '' }` }
                            style={ { backgroundImage: `url(${ asset(!leaderboard.weekly ? 'right_black' : 'right_blue') })` } }
                            type="button"
                            onClick={ () => go('all_time') }>
                            { localizeWithFallback('snowwar.leaderboard.all_time', 'All time') }
                        </button>
                    </div>

                    { canScrollUp && (
                        <button aria-label="Scroll up" className="snowwar-leaderboard__scroll snowwar-leaderboard__scroll--up" style={ scrollImages('up') } type="button" onClick={ () => setRowOffset(offset => Math.max(0, offset - PAGE_SIZE)) } />
                    ) }

                    <div className="snowwar-leaderboard__list">
                        { leaderboard.loading && <div className="snowwar-leaderboard__empty">{ localizeWithFallback('generic.loading', 'Loading...') }</div> }
                        { !leaderboard.loading && !rows.length && (
                            <div className="snowwar-leaderboard__empty">{ localizeWithFallback('gamecenter.leaderboard_empty', 'No scores yet.') }</div>
                        ) }
                        { !leaderboard.loading && rows.map((entry, index) =>
                        {
                            if (!entry) return <div key={ `filler-${ index }` } className="snowwar-leaderboard__row snowwar-leaderboard__row--filler" />;

                            const isGroup = (entry.gender === 'g');
                            const own = (entry.userId === highlightId);

                            return (
                                <div key={ `${ entry.userId }-${ entry.rank }` } className={ `snowwar-leaderboard__row ${ own ? 'is-own' : '' }` }>
                                    { own && <img alt="" className="snowwar-leaderboard__highlight" src={ asset('leaderboard_highlighter') } /> }
                                    <span className="snowwar-leaderboard__rank">{ entry.rank }</span>
                                    <button
                                        className="snowwar-leaderboard__avatar"
                                        type="button"
                                        onClick={ () => (isGroup ? GetGroupInformation(entry.userId) : GetUserProfile(entry.userId)) }>
                                        { isGroup
                                            ? <LayoutBadgeImageView badgeCode={ entry.figure } isGroup={ true } />
                                            : <LayoutAvatarImageView direction={ 2 } figure={ entry.figure } gender={ entry.gender } headOnly={ true } /> }
                                    </button>
                                    <span className="snowwar-leaderboard__name">{ entry.name }</span>
                                    <span className="snowwar-leaderboard__score">{ entry.score }</span>
                                </div>
                            );
                        }) }
                    </div>

                    { canScrollDown && (
                        <button aria-label="Scroll down" className="snowwar-leaderboard__scroll snowwar-leaderboard__scroll--down" style={ scrollImages('down') } type="button" onClick={ () => setRowOffset(offset => Math.min(Math.max(0, leaderboard.entries.length - PAGE_SIZE), offset + PAGE_SIZE)) } />
                    ) }

                    { leaderboard.weekly && (
                        <>
                            { /* AIR previousWeek (left, scroll_left) goes back a week; nextWeek (right) forward. */ }
                            { (leaderboard.currentOffset < leaderboard.maxOffset) && (
                                <button aria-label="Previous week" className="snowwar-leaderboard__week snowwar-leaderboard__week--previous" style={ { backgroundImage: `url(${ asset('scroll_left') })` } } type="button" onClick={ () => goWeek(leaderboard.currentOffset + 1) } />
                            ) }
                            { pastWeek && (
                                <button aria-label="Next week" className="snowwar-leaderboard__week snowwar-leaderboard__week--next" style={ { backgroundImage: `url(${ asset('scroll_right') })` } } type="button" onClick={ () => goWeek(leaderboard.currentOffset - 1) } />
                            ) }
                            { !pastWeek && (
                                <div className="snowwar-leaderboard__reset">
                                    <SnowWarStrokeText text={ localizeWithFallback('snowwar.leaderboard.weekly_reset', 'Reset: %days%d %hours%h %minutes%m')
                                        .replace('%days%', Math.floor(minutesLeft / 1440).toString())
                                        .replace('%hours%', Math.floor((minutesLeft % 1440) / 60).toString())
                                        .replace('%minutes%', (minutesLeft % 60).toString()) } />
                                </div>
                            ) }
                        </>
                    ) }

                    <div className="snowwar-leaderboard__links">
                        <button className={ `snowwar-leaderboard__link ${ (!leaderboard.friendsOnly && !leaderboard.groups) ? 'is-active' : '' }` } type="button" onClick={ () => go('everyone') }>
                            { localizeWithFallback('snowwar.leaderboard.all', 'Top Scores') }
                        </button>
                        <button className={ `snowwar-leaderboard__link ${ leaderboard.friendsOnly ? 'is-active' : '' }` } type="button" onClick={ () => go('friends') }>
                            { localizeWithFallback('snowwar.leaderboard.friends', 'Friends Scores') }
                        </button>
                        <button className={ `snowwar-leaderboard__link ${ leaderboard.groups ? 'is-active' : '' }` } type="button" onClick={ () => go('groups') }>
                            { localizeWithFallback('people.groups.title', 'Groups') }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
