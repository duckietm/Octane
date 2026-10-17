import { IWiredLeaderboardChoice, IWiredLeaderboardColumn, IWiredLeaderboardRow } from '@octane/renderer';
import { FC, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomTileScreenLocation, GetUserProfile, localizeWithFallback } from '../../../../api';
import {
    formatLeaderboardTime,
    formatLeaderboardValue,
    LEADERBOARD_CHUNK_SIZE,
    LEADERBOARD_COLUMN_PIXELS,
    LEADERBOARD_MAX_OFFSET_X,
    LEADERBOARD_MIN_OFFSET_X,
    LEADERBOARD_PAGE_SIZES,
    LEADERBOARD_RANK_GUTTER,
    LeaderboardColumnType,
    leaderboardPanelWidth
} from '../../../../api/wired/WiredLeaderboard';
import { LayoutAvatarImageView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';

/** Where a panel stands: a tile, a horizontal offset and an altitude, both in pixels at scale 1. */
export interface ILeaderboardLocation {
    tileX: number;
    tileY: number;
    offsetX: number;
    altitude: number;
}

export interface WiredLeaderboardPanelViewProps {
    roomId: number;
    title: string;
    description: string;
    columns: IWiredLeaderboardColumn[];
    choices: IWiredLeaderboardChoice[];
    pageSizeOption: number;
    location: ILeaderboardLocation;
    variableId: string | null;
    page: number;
    total: number | null;
    chunks: Record<number, IWiredLeaderboardRow[]>;
    /** Shown while another box's location is being edited. */
    dimmed?: boolean;
    /** The open editor's panel: it can be dragged to a new location. */
    onRelocate?: (location: ILeaderboardLocation) => void;
    onSelectVariable?: (variableId: string) => void;
    onMovePage?: (delta: number) => void;
}

const TILE_STEP_X = 32;
const ROW_HEIGHT = 20;

/** Usernames and texts read from the left, numbers line up on the right, times sit centred. */
const columnAlign = (type: number): string => {
    if (type === LeaderboardColumnType.USERNAME || type === LeaderboardColumnType.TEXT_CONNECTION) return 'is-left';
    if (type === LeaderboardColumnType.VALUE) return 'is-right';

    return 'is-center';
};
const TILE_STEP_Y = 16;

/**
 * A location after a drag: offsets past ±32 move to the neighbouring tile that shifts the screen
 * x the same way, keeping the panel where it was dropped.
 */
export const relocateLeaderboard = (start: ILeaderboardLocation, dx: number, dy: number): ILeaderboardLocation => {
    let { tileX, tileY } = start;
    let offsetX = Math.round(start.offsetX + dx);
    let altitude = Math.round(start.altitude - dy);

    for (let guard = 0; guard < 1000 && (offsetX > LEADERBOARD_MAX_OFFSET_X || offsetX < LEADERBOARD_MIN_OFFSET_X); guard++) {
        if (offsetX > LEADERBOARD_MAX_OFFSET_X) {
            tileX++;
            offsetX -= TILE_STEP_X;
        } else {
            tileY++;
            offsetX += TILE_STEP_X;
        }

        altitude += TILE_STEP_Y;
    }

    return { tileX, tileY, offsetX, altitude };
};

const monthName = (month: number) => localizeWithFallback(`wiredfurni.params.time.month.${month}`, [ '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][month]);
const minutesAgo = (minutes: number) => localizeWithFallback('wiredfurni.variable_leaderboard.minutes_ago', `${ minutes }m ago`, [ 'minutes' ], [ String(minutes) ]);

const cellText = (row: IWiredLeaderboardRow, type: number, now: number): string => {
    switch (type) {
        case LeaderboardColumnType.VALUE: return formatLeaderboardValue(row.rawValue) || '-';
        case LeaderboardColumnType.LAST_UPDATE: return formatLeaderboardTime(row.lastUpdateTime, now, minutesAgo, monthName);
        case LeaderboardColumnType.CREATION: return formatLeaderboardTime(row.creationTime, now, minutesAgo, monthName);
        case LeaderboardColumnType.LEVEL: return (row.level !== null) ? formatLeaderboardValue(row.level) : '-';
        case LeaderboardColumnType.TEXT_CONNECTION: return row.text ?? '-';
        default: return '';
    }
};

/**
 * One variable leaderboard panel standing over its tile, as the AIR client draws it: the title (and
 * the variable list when it offers more than one), the column headers, a page of ranked rows and the
 * pager. Its bottom centre sits on the tile centre, moved by the offset and altitude, and it scales
 * with the room zoom.
 */
export const WiredLeaderboardPanelView: FC<WiredLeaderboardPanelViewProps> = (props) => {
    const { roomId, title, description, columns, choices, pageSizeOption, location, variableId, page, total, chunks, dimmed = false, onRelocate = null, onSelectVariable = null, onMovePage = null } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const locationRef = useRef(location);
    const scaleRef = useRef(1);
    const [ choicesOpen, setChoicesOpen ] = useState(false);
    const [ now, setNow ] = useState(() => Date.now());

    locationRef.current = location;

    useEffect(() => {
        const updatePosition = () => {
            const element = elementRef.current;

            if (!element) return;

            const current = locationRef.current;
            const point = GetRoomTileScreenLocation(roomId, current.tileX, current.tileY);

            if (!point) {
                element.style.visibility = 'hidden';
                return;
            }

            scaleRef.current = point.scale || 1;
            element.style.visibility = 'visible';
            element.style.left = `${ Math.round(point.x + current.offsetX * point.scale) }px`;
            element.style.top = `${ Math.round(point.y - current.altitude * point.scale) }px`;
            element.style.transform = `translate(-50%, -100%) scale(${ point.scale })`;
        };

        updatePosition();

        return AddAnimationTickerCallback(updatePosition);
    }, [ roomId ]);

    // Relative times ("5m ago") are refreshed every 30 seconds, as in AIR.
    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 30000);

        return () => window.clearInterval(interval);
    }, []);

    const startDrag = (event: ReactMouseEvent) => {
        if (!onRelocate || event.button !== 0) return;

        event.preventDefault();

        const start = { ...locationRef.current };
        const startX = event.clientX;
        const startY = event.clientY;

        const move = (moveEvent: MouseEvent) => {
            const scale = scaleRef.current || 1;

            onRelocate(relocateLeaderboard(start, (moveEvent.clientX - startX) / scale, (moveEvent.clientY - startY) / scale));
        };
        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
    };

    const entriesPerPage = LEADERBOARD_PAGE_SIZES[pageSizeOption] ?? 10;
    const firstRow = page * entriesPerPage;
    const pages = (total !== null && total > 0) ? Math.ceil(total / entriesPerPage) : 1;
    const lastNeeded = (total === null) ? firstRow : Math.max(firstRow, Math.min(firstRow + entriesPerPage, total) - 1);
    const loading = !!variableId && (total === null || Array.from({ length: Math.floor(lastNeeded / LEADERBOARD_CHUNK_SIZE) - Math.floor(firstRow / LEADERBOARD_CHUNK_SIZE) + 1 }, (_, i) => Math.floor(firstRow / LEADERBOARD_CHUNK_SIZE) + i).some((index) => !chunks[index]));
    const empty = !variableId || total === 0;
    const rows: IWiredLeaderboardRow[] = [];

    if (!empty && !loading) {
        for (let i = 0; i < entriesPerPage && firstRow + i < total; i++) {
            const index = firstRow + i;
            const row = chunks[Math.floor(index / LEADERBOARD_CHUNK_SIZE)]?.[index % LEADERBOARD_CHUNK_SIZE];

            if (row) rows.push(row);
        }
    }

    const selected = choices.find((choice) => choice.variableId === variableId);
    const shownTitle = (choices.length > 1 && selected) ? `${ title }: ${ selected.displayName }` : title;
    const width = leaderboardPanelWidth(columns);

    return (
        <div ref={elementRef} className={`octane-wired-leaderboard${ dimmed ? ' octane-wired-leaderboard--dimmed' : '' }${ onRelocate ? ' octane-wired-leaderboard--editing' : '' }`} style={{ visibility: 'hidden', width }} data-testid="leaderboard-panel">
            <div className="octane-wired-leaderboard__head" onMouseDown={startDrag}>
                <div className="octane-wired-leaderboard__heading">
                    <div className={`octane-wired-leaderboard__title${ shownTitle.trim().length ? '' : ' is-placeholder' }`}>
                        {shownTitle.trim().length ? shownTitle : localizeWithFallback('wiredfurni.variable_leaderboard.untitled', 'Leaderboard')}
                    </div>
                    {description.length > 0 && <div className="octane-wired-leaderboard__description">{description}</div>}
                </div>
                {onRelocate && <span className="octane-wired-leaderboard__drag" title={localizeWithFallback('wiredfurni.params.variable_leaderboard.location.drag_status', 'Drag to move')}>✥</span>}
                {choices.length > 1 && (
                    <BaseButton type="button" className="octane-wired-leaderboard__choice-toggle" onMouseDown={(event) => event.stopPropagation()} onClick={() => setChoicesOpen((open) => !open)}>▾</BaseButton>
                )}
            </div>
            {choicesOpen && choices.length > 1 && (
                <div className="octane-wired-leaderboard__choices">
                    {choices.map((choice) => (
                        <BaseButton type="button" key={choice.variableId} className={`octane-wired-leaderboard__choice${ choice.variableId === variableId ? ' is-selected' : '' }`} onClick={() => {
                            setChoicesOpen(false);
                            onSelectVariable?.(choice.variableId);
                        }}>
                            {choice.displayName}
                        </BaseButton>
                    ))}
                </div>
            )}
            <div className="octane-wired-leaderboard__headers">
                <div style={{ width: LEADERBOARD_RANK_GUTTER }}>#</div>
                {columns.map((column, index) => (
                    <div key={index} className={columnAlign(column.type)} style={{ width: LEADERBOARD_COLUMN_PIXELS[column.width] }}>{column.label}</div>
                ))}
            </div>
            <div className="octane-wired-leaderboard__rows" style={{ height: entriesPerPage * ROW_HEIGHT }}>
                {(empty || loading) && (
                    <div className="octane-wired-leaderboard__state">
                        {loading && !empty
                            ? localizeWithFallback('wiredfurni.variable_leaderboard.loading', 'Loading...')
                            : localizeWithFallback('wiredfurni.variable_leaderboard.no_entries', 'No entries yet')}
                    </div>
                )}
                {rows.map((row, position) => (
                    <div key={`${ row.rank }-${ row.userId }`} className={`octane-wired-leaderboard__row${ position % 2 ? ' is-odd' : '' }`}>
                        <div className="octane-wired-leaderboard__rank" style={{ width: LEADERBOARD_RANK_GUTTER }}>{row.rank}</div>
                        {columns.map((column, index) => (column.type === LeaderboardColumnType.USERNAME)
                            ? (
                                <BaseButton type="button" key={index} className="octane-wired-leaderboard__user" style={{ width: LEADERBOARD_COLUMN_PIXELS[column.width] }} onClick={() => GetUserProfile(row.userId)}>
                                    <div className="octane-wired-leaderboard__face">{row.figure && <LayoutAvatarImageView figure={row.figure} headOnly compactHead compactHeadSize={18} direction={2} />}</div>
                                    <span>{row.username}</span>
                                </BaseButton>
                            )
                            : <div key={index} className={`octane-wired-leaderboard__cell ${ columnAlign(column.type) }`} style={{ width: LEADERBOARD_COLUMN_PIXELS[column.width] }}>{cellText(row, column.type, now)}</div>)}
                    </div>
                ))}
                {Array.from({ length: Math.max(0, entriesPerPage - rows.length) }, (_, i) => (
                    <div key={`empty-${ i }`} className={`octane-wired-leaderboard__row is-empty${ (rows.length + i) % 2 ? ' is-odd' : '' }`} />
                ))}
            </div>
            <div className="octane-wired-leaderboard__pager">
                <BaseButton type="button" disabled={page <= 0} onClick={() => onMovePage?.(-1)}>‹</BaseButton>
                <span>{localizeWithFallback('wiredfurni.variable_leaderboard.page', `Page ${ page + 1 } / ${ pages }`, [ 'page', 'pages' ], [ String(page + 1), String(pages) ])}</span>
                <BaseButton type="button" disabled={page + 1 >= pages} onClick={() => onMovePage?.(1)}>›</BaseButton>
            </div>
        </div>
    );
};
