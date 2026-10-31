import { GetRoomVisitsMessageComposer, RoomVisitsEvent, RoomVisitsData } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import roomVisitsXml from '../../../assets/mod-tools/xml/roomvisits_frame.xml?raw';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { findNativeNode, nativeCaption, nativeNumber, nativeScaledRect, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Frame, Native0Rows, Native0Scrollbar, Native0Text } from '../native/NativeWindow0';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SHADE = 0xa2d6ea;
const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);

export interface RoomVisitsProps {
    userId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

// Classic v75 room visits window (Kpe, roomvisits_frame): GetRoomVisits(userId) goes out when it opens and the window only appears when the answer for this user arrives
// (caption "Room visits: <name>"). One 14px row per visit, the first one shaded; the room name opens the room tool, "Enter" goes to the room. The list scrolls with the
// style 0 scrollbar, which takes 17px of the list width only while the rows do not fit. The caption also counts the visits, as the earlier visits window did.
export const RoomVisitsView: FC<RoomVisitsProps> = ({ userId, x, y, width, height, onClose, onResize, onOpenRoomTool, onEnterRoom }) => {
    const root = useMemo(() => parseNativeLayout(roomVisitsXml), []);
    const row = rectOf(findNativeNode(root, 'visitrow'));
    const timeNode = findNativeNode(root, 'time_txt');
    const nameNode = findNativeNode(root, 'room_name_txt');
    const enterNode = findNativeNode(root, 'view_room_txt');
    const enterCaption = nativeCaption(findNativeNode(root, 'view_room_txt'));
    const [data, setData] = useState<RoomVisitsData>(null);
    const [offset, setOffset] = useState(0);
    const requestedRef = useRef(false);

    useEffect(() => {
        // one request per opened window (a development double effect run must not send it twice)
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetRoomVisitsMessageComposer(userId));
    }, [userId]);

    useMessageEvent<RoomVisitsEvent>(RoomVisitsEvent, (event) => {
        const parser = event.getParser();

        if (parser?.data?.userId === userId) setData(parser.data);
    });

    if (!data) return null;

    const clientWidth = width - 12;
    const viewHeight = height - 32;
    const contentHeight = data.rooms.length * row.height;
    const overflow = contentHeight > viewHeight;
    const listWidth = clientWidth - (overflow ? 17 : 0);
    // the row follows the list's width and its fields follow the row (name stretches, time and "Enter" move): the XML's row is 263 wide
    const rowChange = listWidth - row.width;
    const time = nativeScaledRect(timeNode, rowChange, 0);
    const name = nativeScaledRect(nameNode, rowChange, 0);
    const enter = nativeScaledRect(enterNode, rowChange, 0);
    const rowColors = data.rooms.map((_, index) => (index % 2 === 0 ? SHADE : 0xffffff));
    const clamped = Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), offset));

    return (
        <NativeTextTree>
            <NativeWindowShell type="roomVisits" windowKey={`${userId}`} x={x} y={y}>
                <Native0Frame caption={`Room visits: ${data.userName} (${data.rooms.length})`} height={height} width={width} onClose={onClose} onResize={onResize}>
                    <div className="native0-list" style={{ left: 0, top: 0, width: listWidth, height: viewHeight }} onWheel={(event) => setOffset(Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), clamped + event.deltaY * 0.75)))}>
                        <div style={{ position: 'absolute', left: 0, top: -clamped, width: listWidth, height: contentHeight }}>
                            <Native0Rows colors={rowColors} height={contentHeight} rowHeight={row.height} width={listWidth} />
                            {data.rooms.map((room, index) => (
                                <div key={index} style={{ position: 'absolute', left: 0, top: index * row.height, width: listWidth, height: row.height }}>
                                    <Native0Text bold clip height={row.height} text={room.roomName} underline width={name.width} x={name.x} y={0} onClick={() => onOpenRoomTool(room.roomId)} />
                                    <Native0Text height={row.height} text={`${pad(room.enterHour)}:${pad(room.enterMinute)}`} width={time.width} x={time.x} y={0} />
                                    <Native0Text bold height={row.height} text={enterCaption} underline width={enter.width} x={enter.x} y={0} onClick={() => onEnterRoom(room.roomId)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    {overflow && <Native0Scrollbar contentHeight={contentHeight} height={viewHeight} offset={clamped} viewHeight={viewHeight} x={clientWidth - 17} y={0} onOffset={setOffset} />}
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
