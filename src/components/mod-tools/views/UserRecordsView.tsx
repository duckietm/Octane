import { GetModeratorUserRecordsMessageComposer, ModeratorUserRecordData, ModeratorUserRecordsEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../../hooks';
import { Native0Frame, Native0Rows, Native0Scrollbar, Native0Text } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';

/** 0 cautions, 1 the user's own bans, 2 banned accounts linked to the user, 3 trade locks. */
export type UserRecordKind = 0 | 1 | 2 | 3;

export const USER_RECORD_KIND = { cautions: 0, bans: 1, bannedAccounts: 2, tradeLocks: 3 } as const;

const SHADE = 0xa2d6ea;
const ROW_HEIGHT = 14;
const HEADER_HEIGHT = 16;
const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);

/** A unix time in seconds as `dd-mm-yyyy hh:mm` in local time; 0 (unknown or none) is a dash. */
export const formatRecordTime = (seconds: number): string => {
    if (!seconds) return '—';

    const date = new Date(seconds * 1000);

    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const recordTitle = (kind: UserRecordKind, userName: string) => {
    const values = [userName];

    switch (kind) {
        case 1:
            return localizeWithFallback('octane.mod_tools.records.title_bans', 'Bans: %username%', ['username'], values);
        case 2:
            return localizeWithFallback('octane.mod_tools.records.title_banned_accounts', 'Banned accounts: %username%', ['username'], values);
        case 3:
            return localizeWithFallback('octane.mod_tools.records.title_trade_locks', 'Trade locks: %username%', ['username'], values);
        default:
            return localizeWithFallback('octane.mod_tools.records.title_cautions', 'Cautions: %username%', ['username'], values);
    }
};

type RecordColumn = 'date' | 'account' | 'staff' | 'type' | 'reason' | 'expires';

// Fixed widths; the reason takes what is left of the row.
const COLUMN_WIDTH: Record<Exclude<RecordColumn, 'reason'>, number> = { date: 92, account: 90, staff: 80, type: 70, expires: 92 };

const columnTitle = (column: RecordColumn) => {
    switch (column) {
        case 'date':
            return localizeWithFallback('octane.mod_tools.records.date', 'Date');
        case 'account':
            return localizeWithFallback('octane.mod_tools.records.account', 'Account');
        case 'staff':
            return localizeWithFallback('octane.mod_tools.records.staff', 'Staff');
        case 'type':
            return localizeWithFallback('octane.mod_tools.records.type', 'Type');
        case 'reason':
            return localizeWithFallback('octane.mod_tools.records.reason', 'Reason');
        default:
            return localizeWithFallback('octane.mod_tools.records.expires', 'Expires');
    }
};

const columnText = (column: RecordColumn, record: ModeratorUserRecordData) => {
    switch (column) {
        case 'date':
            return formatRecordTime(record.timestamp);
        case 'account':
            return record.username;
        case 'staff':
            return record.staffName || '—';
        case 'type':
            return record.type;
        case 'reason':
            return record.reason;
        default:
            return formatRecordTime(record.expires);
    }
};

export interface UserRecordsProps {
    userId: number;
    userName: string;
    kind: UserRecordKind;
    x: number;
    y: number;
    width: number;
    height: number;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
}

interface RecordsAnswer {
    undetailed: number;
    records: ModeratorUserRecordData[];
}

// The moderation records of one user, one window per user and kind: GetModeratorUserRecords(userId, kind) goes out when it opens and the window only appears when
// the answer for this user and kind arrives. Laid out like the room visits window: one 14px row per record, every other one shaded, under a bold column header;
// the list scrolls with the style 0 scrollbar, which takes 17px of the list width only while the rows do not fit.
export const UserRecordsView: FC<UserRecordsProps> = ({ userId, userName, kind, x, y, width, height, onClose, onResize }) => {
    const [answer, setAnswer] = useState<RecordsAnswer>(null);
    const [offset, setOffset] = useState(0);
    const requestedRef = useRef(false);

    useEffect(() => {
        // one request per opened window (a development double effect run must not send it twice)
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetModeratorUserRecordsMessageComposer(userId, kind));
    }, [userId, kind]);

    useMessageEvent<ModeratorUserRecordsEvent>(ModeratorUserRecordsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.userId !== userId || parser.kind !== kind) return;

        setAnswer({ undetailed: kind === 0 ? parser.undetailed : 0, records: parser.records ?? [] });
    });

    if (!answer) return null;

    const columns: RecordColumn[] = kind === 2 ? ['date', 'account', 'staff', 'type', 'reason', 'expires'] : ['date', 'staff', 'type', 'reason', 'expires'];
    const lines: string[] = [];

    if (answer.undetailed > 0)
        lines.push(
            localizeWithFallback('octane.mod_tools.records.undetailed', '%count% earlier cautions without details', ['count'], [`${answer.undetailed}`])
        );
    if (!answer.records.length && !lines.length) lines.push(localizeWithFallback('octane.mod_tools.records.empty', 'No records'));

    const rowCount = answer.records.length + lines.length;
    const clientWidth = width - 12;
    const viewHeight = height - 32 - HEADER_HEIGHT;
    const contentHeight = rowCount * ROW_HEIGHT;
    const overflow = contentHeight > viewHeight;
    const listWidth = clientWidth - (overflow ? 17 : 0);
    const fixed = columns.reduce((sum, column) => sum + (column === 'reason' ? 0 : COLUMN_WIDTH[column]), 0);
    const placed = columns.reduce<{ column: RecordColumn; x: number; width: number }[]>((list, column) => {
        const left = list.length ? list[list.length - 1].x + list[list.length - 1].width : 0;

        return [...list, { column, x: left, width: column === 'reason' ? Math.max(60, listWidth - fixed) : COLUMN_WIDTH[column] }];
    }, []);
    const rowColors = Array.from({ length: rowCount }, (_, index) => (index % 2 === 0 ? SHADE : 0xffffff));
    const clamped = Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), offset));

    return (
        <NativeTextTree>
            <NativeWindowShell type="userRecords" windowKey={`${userId}:${kind}`} x={x} y={y}>
                <Native0Frame caption={recordTitle(kind, userName)} height={height} width={width} onClose={onClose} onResize={onResize}>
                    {placed.map((cell) => (
                        <Native0Text
                            key={cell.column}
                            bold
                            clip
                            height={ROW_HEIGHT}
                            text={columnTitle(cell.column)}
                            width={cell.width - 4}
                            x={cell.x + 3}
                            y={0}
                        />
                    ))}
                    <div
                        className="native0-list"
                        style={{ left: 0, top: HEADER_HEIGHT, width: listWidth, height: viewHeight }}
                        onWheel={(event) => setOffset(Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), clamped + event.deltaY * 0.75)))}
                    >
                        <div style={{ position: 'absolute', left: 0, top: -clamped, width: listWidth, height: contentHeight }}>
                            <Native0Rows colors={rowColors} height={contentHeight} rowHeight={ROW_HEIGHT} width={listWidth} />
                            {answer.records.map((record, index) => (
                                <div
                                    key={index}
                                    data-testid="user-record"
                                    style={{ position: 'absolute', left: 0, top: index * ROW_HEIGHT, width: listWidth, height: ROW_HEIGHT }}
                                >
                                    {placed.map((cell) => (
                                        <Native0Text
                                            key={cell.column}
                                            clip
                                            height={ROW_HEIGHT}
                                            text={columnText(cell.column, record)}
                                            width={cell.width - 4}
                                            x={cell.x + 3}
                                            y={0}
                                        />
                                    ))}
                                </div>
                            ))}
                            {lines.map((line, index) => (
                                <Native0Text
                                    key={line}
                                    height={ROW_HEIGHT}
                                    text={line}
                                    width={listWidth - 6}
                                    x={3}
                                    y={(answer.records.length + index) * ROW_HEIGHT}
                                />
                            ))}
                        </div>
                    </div>
                    {overflow && (
                        <Native0Scrollbar
                            contentHeight={contentHeight}
                            height={viewHeight}
                            offset={clamped}
                            viewHeight={viewHeight}
                            x={clientWidth - 17}
                            y={HEADER_HEIGHT}
                            onOffset={setOffset}
                        />
                    )}
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
