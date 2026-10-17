import {
    CfhChatlogEvent,
    ChatlineData,
    ChatRecordData,
    CreateLinkEvent,
    GetConfiguration,
    GetCfhChatlogMessageComposer,
    GetRoomChatlogMessageComposer,
    GetUserChatlogMessageComposer,
    RoomChatlogEvent,
    UserChatlogEvent
} from '@octane/renderer';
import { ElementType, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OpenUrl, SendMessageComposer } from '../../../api';
import { NativeText } from '../../../common/native-text/NativeText';
import { useMessageEvent } from '../../../hooks';
import evidenceXml from '../../../assets/mod-tools/xml/evidence_frame.xml?raw';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Rows, Native0Scrollbar } from '../native/NativeWindow0';
import { chatlineMatches } from './chatlogFilter';
import { BaseButton } from '../../../common/BaseButton';

export type EvidenceChatlogKind = 'user' | 'room' | 'cfh';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const FRAME_COLOR = 0x418db0;
const ZEBRA = 0xc3ecfa;
const WHITE = 0xffffff;
/** Q5._r6c80a12d5cc1f7 / _r0ddfbe3e000602: the rows of the chatters the window was opened for (the reported user: 0, the caller: 1). */
const HIGHLIGHT = [0xf0d6a3, 0xa3bdf0];
const MIN_LINE_HEIGHT = 17;
// A message row is the message field's textHeight + 5 (classic Q5 `_r9b26f640bf0ca4` / `_r56f7b643e3bd62`, launcher.pretty.js:281473-281530) and the field's textHeight is its line count times the
// 13.4px line of Ubuntu 12 (the shared NativeText metrics: ascent 11.15 + descent 2.25), cut to a whole pixel: 31 for 2 lines, 45 for 3, 58 for 4, 72 for 5 (not lines * 13.33)
const MESSAGE_LINE_HEIGHT = 13.4;
const NO_LINES: Record<number, number> = {};

export interface Evidence {
    /** Which delivery this is: a record that replaces another in the same window starts its rows (and what they remember of their first layout) afresh. */
    serial: number;
    /** What it was asked for (`kind:id`): the answer only shows while that is still the window's subject. */
    subject: string;
    caption: string;
    records: ChatRecordData[];
    highlights: Map<number, number>;
}

type Item = { kind: 'header'; record: ChatRecordData } | { kind: 'line'; line: ChatlineData; color: number } | { kind: 'note'; text: string };

interface HeaderButton {
    label: string;
    onClick: () => void;
}

interface HeaderOptions {
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

/**
 * AIR ChatlogCtrl.populateEvidence: what a record's header says and which buttons it carries, by the record type. A room chat names its room (Room tool, View room),
 * an IM session has no buttons, a forum thread or message opens its forum, a selfie opens its picture and a photo its moderation page (when one is configured), both
 * with the room tool of the room they were taken in. The forum "Delete" button is left out: this server's thread delete erases the thread instead of hiding it.
 */
const headerOf = (record: ChatRecordData, options: HeaderOptions): { label: string; action: HeaderButton | null; action2: HeaderButton | null } => {
    const roomTool = record.roomId > 0 ? { label: 'Room tool', onClick: () => options.onOpenRoomTool(record.roomId) } : null;
    const context = record.context;

    switch (record.recordType) {
        case ChatRecordData.TYPE_IM_SESSION:
            return { label: 'IM session', action: null, action2: null };
        case ChatRecordData.TYPE_DISCUSSION_THREAD:
            return { label: 'Forum thread', action: null, action2: record.groupId > 0 ? { label: 'Open thread', onClick: () => CreateLinkEvent(`groupforum/${record.groupId}`) } : null };
        case ChatRecordData.TYPE_DISCUSSION_MESSAGE:
            return { label: 'Forum message', action: null, action2: record.groupId > 0 ? { label: 'Open Message', onClick: () => CreateLinkEvent(`groupforum/${record.groupId}`) } : null };
        case ChatRecordData.TYPE_SELFIE: {
            const url = context?.get('url');

            return { label: 'Selfie report', action: roomTool, action2: url ? { label: 'View selfie', onClick: () => OpenUrl(`${url}`) } : null };
        }
        case ChatRecordData.TYPE_PHOTO: {
            const base = GetConfiguration().getValue<string>('stories.admin.tool.base.url', '');
            const photoId = context?.get('extraDataId');

            return { label: 'Photo report', action: roomTool, action2: base && photoId ? { label: 'Moderate photo', onClick: () => OpenUrl(`${base}${photoId}`) } : null };
        }
        default:
            if (record.roomId > 0) return { label: record.roomName == null ? `Room #${record.roomId}` : `Room: ${record.roomName}`, action: roomTool, action2: { label: 'View room', onClick: () => options.onEnterRoom(record.roomId) } };

            return { label: 'Chatlog', action: null, action2: null };
    }
};

export interface EvidenceChatlogListProps {
    evidence: Evidence;
    /** The width of the rows while the scroller shows (they grow by `hiddenExtra` while the rows fit). */
    listWidth: number;
    /** How much wider the rows are while the scroller is hidden (22px, 23px in the chatlog window). */
    hiddenExtra?: number;
    /** The width of the clipped viewport the rows and the header buttons are drawn in (the rows' width unless the window says otherwise: the header buttons reach past the shorter rows). */
    viewportWidth?: number;
    /** The chat line follows the list's width (the chatlog window's own list); the handler's embedded list keeps the XML's line. */
    lineFollowsList?: boolean;
    scrollbarX: number;
    scrollbarHeight: number;
    viewHeight: number;
    scrollbarVariant?: 0 | 3;
    scrollbarBlend?: number;
    /** Only the lines whose speaker or message contain this are listed (a record without such a line is left out entirely). */
    query?: string;
    /** Shown under a record without any line, and when the query matches nothing. */
    emptyText?: string;
    noMatchText?: string;
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

let evidenceSerial = 0;

/**
 * Asks for the subject of a chatlog and returns the answer once it arrives (classic Q5.show and its message handlers). A new subject (the handler's selected issue, classic cme
 * `_r09b0702aa5e34c` -> `Ey(issueId)` + `Q5._rfe4d5878f91c65(issueId)`, launcher.pretty.js:283314-283338) is requested once and an answer is only taken for the current subject (Q5
 * `_rd036c119a942fb`, 281236: `type === this._type && id === this._id`). The answer of another subject is never returned, so a list switching subject has no content (not the old
 * subject's) until its own answer arrives, also when it returns to a subject whose earlier answer is still held (A, B asked and unanswered, A again: the held A is dropped when the
 * subject changes, in the render of the change). The protocol carries no request id, so a delayed answer of an earlier request for the same subject cannot be told from the one asked
 * for last: the first answer of the subject is taken, a later one replaces it. A subject of 0 asks for nothing.
 */
export const useEvidence = (kind: EvidenceChatlogKind, id: number): Evidence => {
    const [evidence, setEvidence] = useState<Evidence>(null);
    const requestedRef = useRef<string>(null);
    const subject = id > 0 ? `${kind}:${id}` : null;
    // the subject the held answer belongs to; when the subject changes the held answer is dropped in this render, not in an effect (no frame shows it)
    const [heldFor, setHeldFor] = useState<string>(subject);

    if (heldFor !== subject) {
        setHeldFor(subject);
        setEvidence(null);
    }

    useEffect(() => {
        // one request per subject (a development double effect run must not send it twice); a subject asked for again after another one is asked for again
        if (subject === null || requestedRef.current === subject) {
            if (subject === null) requestedRef.current = null;

            return;
        }

        requestedRef.current = subject;
        SendMessageComposer(kind === 'user' ? new GetUserChatlogMessageComposer(id) : kind === 'room' ? new GetRoomChatlogMessageComposer(id) : new GetCfhChatlogMessageComposer(id));
    }, [kind, id, subject]);

    useMessageEvent<UserChatlogEvent>(UserChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'user' && data?.userId === id) setEvidence({ serial: ++evidenceSerial, subject: `user:${id}`, caption: `User Chatlog: ${data.username}`, records: data.roomChatlogs, highlights: new Map([[data.userId, 0]]) });
    });

    useMessageEvent<RoomChatlogEvent>(RoomChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'room' && data?.roomId === id) setEvidence({ serial: ++evidenceSerial, subject: `room:${id}`, caption: `Room Chatlog: ${data.roomName}`, records: [data], highlights: new Map() });
    });

    useMessageEvent<CfhChatlogEvent>(CfhChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'cfh' && data?.issueId === id) {
            setEvidence({
                serial: ++evidenceSerial,
                subject: `cfh:${id}`,
                caption: `Call For Help Evidence #${data.chatRecordId}`,
                records: [data.chatRecord],
                highlights: new Map([
                    [data.callerUserId, 0],
                    [data.reportedUserId, 1]
                ])
            });
        }
    });

    return evidence !== null && heldFor === subject && evidence.subject === subject ? evidence : null;
};

// The rows of a chatlog window (AIR ChatlogCtrl.populateContentLine): each record starts with a header row (what the log is of, "Room tool" / "View room" for a room), then one row per
// line; the rows alternate between a pale blue and white and the chatters the window was opened for take 0xf0d6a3 (the reported user) or 0xa3bdf0 (the caller). A line is 17px at
// least and as high as its wrapped message plus 5px. The row colour is the BACKGROUND of the line and of its time, chatter and message windows (AIR sets their `color`); the texts keep
// their own black. (The classic JS client sets `textColor` to the row colour there, which draws every name and message in the colour of its own background: unreadable.) A line of the
// chatters of the log (the highlight flag) has its message in bold.
export const EvidenceChatlogList: FC<EvidenceChatlogListProps> = ({ evidence, listWidth, hiddenExtra = 22, viewportWidth, lineFollowsList = false, scrollbarX, scrollbarHeight, viewHeight, scrollbarVariant = 0, scrollbarBlend, query = '', emptyText, noMatchText, onOpenUserInfo, onOpenRoomTool, onEnterRoom }) => {
    const root = useMemo(() => parseNativeLayout(evidenceXml), []);
    const list = findNativeNode(root, 'evidence_list');
    const header = rectOf(list.children[0]);
    const label = rectOf(findNativeNode(root, 'text'));
    const action = rectOf(findNativeNode(root, 'btnHeaderAction'));
    const action2 = rectOf(findNativeNode(root, 'btnHeaderAction2'));
    const line = rectOf(findNativeNode(root, 'chatline'));
    const time = rectOf(findNativeNode(root, 'time_txt'));
    const chatter = rectOf(findNativeNode(root, 'chatter_txt'));
    const message = rectOf(findNativeNode(root, 'msg_txt'));
    const [offset, setOffset] = useState(0);
    // wrapped line count of each message, by item index, of the evidence they were measured for
    const [measured, setMeasured] = useState<{ serial: number; lines: Record<number, number> }>({ serial: -1, lines: {} });
    const messageHeights = measured.serial === evidence?.serial ? measured.lines : NO_LINES;
    // set by the first change of the list's size: only then does the window re-read whether its rows overflow (classic Q5 `_r8b94a8d2d60957`)
    const [sizeChanged, setSizeChanged] = useState(false);
    const sizeRef = useRef({ listWidth, viewHeight });

    const items = useMemo<Item[]>(() => {
        if (!evidence) return [];

        const result: Item[] = [];
        const filtering = query.trim().length > 0;

        for (const record of evidence.records) {
            const lines = filtering ? record.chatlog.filter((chatLine) => chatlineMatches(chatLine.userName, chatLine.message, query)) : record.chatlog;

            if (filtering && lines.length === 0) continue;

            // every record starts its rows on the pale blue again
            let zebra = true;

            result.push({ kind: 'header', record });

            if (!lines.length && emptyText) result.push({ kind: 'note', text: emptyText });

            for (const chatLine of lines) {
                const highlight = evidence.highlights.get(chatLine.userId);
                const color = highlight !== undefined ? HIGHLIGHT[highlight] : zebra ? ZEBRA : WHITE;

                result.push({ kind: 'line', line: chatLine, color });
                zebra = !zebra;
            }
        }

        if (filtering && !result.length && noMatchText) result.push({ kind: 'note', text: noMatchText });

        return result;
    }, [evidence, query, emptyText, noMatchText]);

    const rowHeight = (index: number, item: Item) => (item.kind === 'header' ? header.height : item.kind === 'note' ? MIN_LINE_HEIGHT : Math.max(MIN_LINE_HEIGHT, Math.trunc((messageHeights[index] ?? 0) * MESSAGE_LINE_HEIGHT + 5)));
    const tops: number[] = [];
    let contentHeight = 0;

    items.forEach((item, index) => {
        tops.push(contentHeight);
        contentHeight += rowHeight(index, item);
    });

    const overflow = contentHeight > viewHeight;
    // the window's own list starts with its scroller shown (the XML's state) and only the first resize's timer re-reads whether the rows overflow (classic Q5 `_r8b94a8d2d60957`)
    const scrollerShown = overflow || (lineFollowsList && !sizeChanged);
    const width = listWidth + (scrollerShown ? 0 : hiddenExtra);
    const viewport = viewportWidth ?? width;
    const range = Math.max(0, contentHeight - viewHeight);
    const clamped = Math.max(0, Math.min(range, offset));
    const rowColors = items.map((item) => (item.kind === 'header' ? FRAME_COLOR : item.kind === 'note' ? WHITE : item.color));
    const heights = items.map((item, index) => rowHeight(index, item));

    useLayoutEffect(() => {
        if (listWidth !== sizeRef.current.listWidth || viewHeight !== sizeRef.current.viewHeight) setSizeChanged(true);

        sizeRef.current = { listWidth, viewHeight };
    }, [listWidth, viewHeight]);
    // the chat line follows the width of the list (scale bits 144: it stretches) and its message field is what is left of it, so a narrower window wraps the messages onto more lines;
    // the handler's embedded list keeps the XML's line
    const lineWidth = lineFollowsList ? width : line.width;
    const messageWidth = lineWidth - message.x;

    return (
        <>
            <div className="native0-list" style={{ left: 0, top: 0, width: viewport, height: viewHeight }} onWheel={(event) => setOffset(Math.max(0, Math.min(range, clamped + event.deltaY * 0.75)))}>
                <div style={{ position: 'absolute', left: 0, top: -clamped, width: viewport, height: contentHeight }}>
                    <Native0Rows colors={rowColors} heights={heights} width={lineFollowsList ? width : Math.min(width, Math.max(header.width, line.width))} />
                    {items.map((item, index) => {
                        if (item.kind === 'note') {
                            return (
                                <div key={`${evidence.serial}:${index}`} style={{ position: 'absolute', left: message.x, top: tops[index] + 2, width: lineWidth - message.x, height: MIN_LINE_HEIGHT, overflow: 'hidden', fontSize: 0, lineHeight: 0 }}>
                                    <NativeText background={WHITE} overrides={{ color: 0x666666 }} text={item.text} textStyle="u_regular" />
                                </div>
                            );
                        }

                        if (item.kind === 'header') {
                            const heading = headerOf(item.record, { onEnterRoom, onOpenRoomTool });

                            return (
                            <div key={`${evidence.serial}:${index}`} style={{ position: 'absolute', left: 0, top: tops[index], width: header.width, height: header.height, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: label.x, top: label.y, width: header.width - action2.x, height: label.height, overflow: 'hidden', fontSize: 0, lineHeight: 0 }}>
                                    <NativeText background={FRAME_COLOR} overrides={{ color: 0xffffff }} text={heading.label} textStyle="u_headline_small" />
                                </div>
                                {heading.action2 && <Native0Button height={action.height} label={heading.action2.label} width={action2.width} x={action2.x} y={action2.y} onClick={heading.action2.onClick} />}
                                {heading.action && <Native0Button height={action.height} label={heading.action.label} width={action.width} x={action.x} y={action.y} onClick={heading.action.onClick} />}
                            </div>
                            );
                        }

                        const Chatter: ElementType = item.line.userId > 0 ? BaseButton : 'div';

                        return (
                            <div key={`${evidence.serial}:${index}`} style={{ position: 'absolute', left: 0, top: tops[index], width: lineWidth, height: heights[index] }}>
                                <div style={{ position: 'absolute', left: time.x, top: time.y, width: time.width, height: heights[index], overflow: 'hidden', fontSize: 0, lineHeight: 0 }}>
                                    <NativeText background={item.color} text={item.line.timestamp} textStyle="u_bold" />
                                </div>
                                <Chatter {...(item.line.userId > 0 ? { type: 'button' } : {})} style={{ position: 'absolute', left: chatter.x, top: chatter.y, width: chatter.width, height: heights[index], overflow: 'hidden', fontSize: 0, lineHeight: 0, cursor: item.line.userId > 0 ? 'pointer' : undefined }} onClick={item.line.userId > 0 ? () => onOpenUserInfo(item.line.userId) : undefined}>
                                    <NativeText
                                        background={item.color}
                                        overrides={{ underline: item.line.userId > 0, bold: true }}
                                        text={item.line.userId > 0 ? item.line.userName : item.line.userId === 0 ? 'Bot / pet' : '-'}
                                        textStyle="u_bold"
                                    />
                                </Chatter>
                                <MessageText
                                    background={item.color}
                                    bold={item.line.hasHighlighting}
                                    text={item.line.message}
                                    width={messageWidth}
                                    x={message.x}
                                    y={message.y}
                                    onHeight={(value) => setMeasured((previous) => (previous.serial === evidence.serial ? (previous.lines[index] === value ? previous : { serial: previous.serial, lines: { ...previous.lines, [index]: value } }) : { serial: evidence.serial, lines: { [index]: value } }))}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            {scrollerShown && <Native0Scrollbar contentHeight={contentHeight} height={scrollbarHeight} offset={clamped} blend={scrollbarBlend} variant={scrollbarVariant} viewHeight={viewHeight} x={scrollbarX} y={0} onOffset={setOffset} />}
        </>
    );
};

/** The message field: Ubuntu regular (bold for a highlighted line) on the row colour, wrapped at the field width; its height drives the height of the row. */
const MessageText: FC<{ text: string; background: number; bold: boolean; width: number; x: number; y: number; onHeight: (height: number) => void }> = ({ text, background, bold, width, x, y, onHeight }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        // the number of wrapped lines, from the raster the field draws (a line of Ubuntu 12 is 13 1/3 px high, plus 4px of gutter)
        const measure = () => {
            const canvas = element.querySelector('canvas');

            // (a canvas that is not shown yet is still the browser's 300 x 150 default, not the field)
            if (canvas && canvas.style.display !== 'none' && canvas.height > 4) onHeight(Math.max(1, Math.round((canvas.height - 4) / MESSAGE_LINE_HEIGHT)));
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [onHeight, text, width]);

    // the field raster is drawn asynchronously: watch for the canvas appearing or resizing
    useEffect(() => {
        const element = ref.current;

        if (!element || typeof MutationObserver === 'undefined') return;

        const observer = new MutationObserver(() => {
            const canvas = element.querySelector('canvas');

            // (a canvas that is not shown yet is still the browser's 300 x 150 default, not the field)
            if (canvas && canvas.style.display !== 'none' && canvas.height > 4) onHeight(Math.max(1, Math.round((canvas.height - 4) / MESSAGE_LINE_HEIGHT)));
        });

        observer.observe(element, { attributes: true, childList: true, subtree: true });

        return () => observer.disconnect();
    }, [onHeight, text, width]);

    return (
        <div ref={ref} style={{ position: 'absolute', left: x, top: y, width }}>
            <NativeText background={background} maxWidth={width} overrides={bold ? { bold: true } : undefined} text={text} textStyle="u_regular" />
        </div>
    );
};
