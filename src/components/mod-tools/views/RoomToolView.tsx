import {
    GetConfiguration,
    GetModeratorRoomInfoMessageComposer,
    ModerateRoomMessageComposer,
    ModeratorActionMessageComposer,
    ModeratorInitData,
    ModeratorRoomInfoEvent,
    RoomModerationData
} from '@octane/renderer';
import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, OpenUrl, SendMessageComposer, TryVisitRoom } from '../../../api';
import { showModAlert, useMessageEvent, useModWindowTrackerStore } from '../../../hooks';
import roomToolXml from '../../../assets/mod-tools/xml/roomtool_frame.xml?raw';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Border, Native0Button, Native0Checkbox, Native0Dropmenu, Native0Frame, Native0Input, Native0Text } from '../native/NativeWindow0';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SPACING = 5;

export interface RoomToolProps {
    roomId: number;
    /** Screen position the window tracker chose (right of the start panel). */
    x: number;
    y: number;
    settings: ModeratorInitData;
    /** The room the moderator is in right now (0 outside a room). */
    currentRoomId: number;
    onOpenUserInfo: (userId: number) => void;
    onOpenChatlog: (roomId: number) => void;
    onClose: () => void;
}

// Classic v75 RoomToolCtrl (RQ): the window is built from roomtool_frame and GetModeratorRoomInfo(flat) goes out when it opens; the XML placeholders show until
// the answer for this flat arrives. The caution / message buttons act on the room alert permission and only for the room the moderator is in. The event box,
// which this hotel never fills with an event, carries the room id and a refresh link kept from the earlier room tool.
export const RoomToolView: FC<RoomToolProps> = ({ roomId, x, y, settings, currentRoomId, onOpenUserInfo, onOpenChatlog, onClose }) => {
    const root = useMemo(() => parseNativeLayout(roomToolXml), []);
    const at = (name: string) => rectOf(findNativeNode(root, name));
    const placeholder = nativeCaption(findNativeNode(root, 'message_input'));
    const refresh = () => SendMessageComposer(new GetModeratorRoomInfoMessageComposer(roomId));
    const menuCaption = nativeCaption(findNativeNode(root, 'msgTemplatesSelect'));
    const act = findNativeNode(root, 'act_cont');
    const [data, setData] = useState<RoomModerationData>(null);
    const [nameHeight, setNameHeight] = useState(0);
    const [descHeight, setDescHeight] = useState(0);
    const [tagsHeight, setTagsHeight] = useState(0);
    const [message, setMessage] = useState(placeholder);
    const [isPlaceholder, setIsPlaceholder] = useState(true);
    const [inputActive, setInputActive] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(-1);
    const [kick, setKick] = useState(false);
    const [lock, setLock] = useState(false);
    const [changeName, setChangeName] = useState(false);

    const resizeWindow = useModWindowTrackerStore((state) => state.resize);
    const requestedRef = useRef(false);

    useEffect(() => {
        // one request per opened window (a development double effect run must not send it twice)
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetModeratorRoomInfoMessageComposer(roomId));
    }, [roomId]);

    useMessageEvent<ModeratorRoomInfoEvent>(ModeratorRoomInfoEvent, (event) => {
        const parser = event.getParser();

        if (parser?.data?.flatId === roomId) setData(parser.data);
    });

    const roomCont = at('room_cont');
    const roomData = at('room_data');
    const info = at('info_cont');
    const eventCont = at('event_cont');
    const actCont = at('act_cont');
    const menu = at('msgTemplatesSelect');
    const input = at('message_input');
    const footer = at('footer_cont');
    const exists = !!data && data.room.exists;
    const tags = data?.room?.tags ?? [];
    // _r13a7bd05aa7cbe: name, description and tags stack with no spacing; the border is the stack plus the room_data margin twice. Without a room
    // (data.room.exists false) the room box and the spacing after the info box (event_spacing) are removed from the list.
    const stackHeight = nameHeight + descHeight + (tags.length > 0 ? tagsHeight : 0);
    const roomContHeight = data ? (exists ? stackHeight + 2 * roomData.y : 0) : roomCont.height;
    const items: { key: string; height: number }[] = [
        ...(data && !exists ? [] : [{ key: 'room', height: roomContHeight }]),
        { key: 'space1', height: SPACING },
        { key: 'info', height: info.height },
        ...(data && !exists ? [] : [{ key: 'space2', height: SPACING }]),
        { key: 'event', height: eventCont.height },
        { key: 'space3', height: SPACING },
        { key: 'act', height: actCont.height },
        { key: 'space4', height: SPACING },
        { key: 'menu', height: menu.height },
        { key: 'space5', height: SPACING },
        { key: 'input', height: input.height },
        { key: 'space6', height: SPACING },
        { key: 'space7', height: SPACING },
        { key: 'footer', height: footer.height }
    ];
    const row: Record<string, number> = {};
    let cursor = 0;

    for (const item of items) {
        row[item.key] = cursor;
        cursor += item.height;
    }

    const frameHeight = cursor + 32;

    // the tracker places the windows opened from this one by its current frame
    useEffect(() => resizeWindow('roomTool', `${roomId}`, nativeNumber(root, 'width'), frameHeight), [resizeWindow, roomId, root, frameHeight]);
    // The answer for this flat, the moderator being in that very room and the room alert permission: the classic tool only wires its send buttons when the answer arrives (RQ.populate attaches
    // the click listeners) and enables them by exactly this rule (RQ._r8595b44a050a80, launcher.pretty.js:281598-281636). Until then the window shows its XML (enabled looking) buttons, which
    // do nothing; the action carries no room id, so it always lands on the room the moderator is in.
    const eligible = !!data && data.flatId === currentRoomId && !!settings?.roomAlertPermission;
    const canAct = data ? eligible : true;
    // the room the sends are for right now (0: none), refreshed with every commit so a callback captured earlier still sees the present state when it runs
    const sendFlatRef = useRef(0);

    useLayoutEffect(() => {
        sendFlatRef.current = eligible ? data.flatId : 0;
    }, [eligible, data]);

    const templates = settings.roomMessageTemplates ?? [];

    // the window is disposed by its first send: a second click before it is gone must not send again
    const sentRef = useRef(false);

    const send = (caution: boolean) => {
        const flatId = sendFlatRef.current;

        if (sentRef.current || flatId === 0) return;

        if (isPlaceholder || message === '') {
            showModAlert('You must input a message to the user');

            return;
        }

        const type = kick
            ? caution
                ? ModeratorActionMessageComposer.ACTION_KICK
                : ModeratorActionMessageComposer.ACTION_MESSAGE_AND_SOFT_KICK
            : caution
              ? ModeratorActionMessageComposer.ACTION_ALERT
              : ModeratorActionMessageComposer.ACTION_MESSAGE;

        sentRef.current = true;
        SendMessageComposer(new ModeratorActionMessageComposer(type, message, ''));

        if (lock || changeName || kick) SendMessageComposer(new ModerateRoomMessageComposer(flatId, lock ? 1 : 0, changeName ? 1 : 0, kick ? 1 : 0));

        onClose();
    };

    return (
        <NativeWindowShell type="roomTool" windowKey={`${roomId}`} x={x} y={y}>
            <Native0Frame caption={nativeCaption(root)} height={frameHeight} width={nativeNumber(root, 'width')} onClose={onClose}>
                {/* the boxes (230 wide) are wider than the client area and the window clips them at the client's right edge (the dark right border does not show) */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: nativeNumber(root, 'width') - 12, height: 2000, overflow: 'hidden' }}>
                    {(!data || exists) && (
                        <Native0Border {...roomCont} height={roomContHeight} y={row.room}>
                            {data && exists && (
                                <div style={{ position: 'absolute', left: roomData.x, top: roomData.y, width: roomData.width, height: stackHeight }}>
                                    <Native0Text bold text={data.room.name} wrap width={220} x={0} y={0} onSize={(size) => setNameHeight(size.height)} />
                                    <Native0Text color={0x808080} text={data.room.desc} wrap width={220} x={0} y={nameHeight} onSize={(size) => setDescHeight(size.height)} />
                                    {tags.length > 0 && (
                                        <div style={{ position: 'absolute', left: 0, top: nameHeight + descHeight }}>
                                            <Native0Text bold text="Tags:" width={40} x={0} y={0} />
                                            <Native0Text bold text={tags.join(', ')} wrap width={178} x={39} y={0} onSize={(size) => setTagsHeight(size.height)} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </Native0Border>
                    )}
                    <Native0Border {...info} y={row.info}>
                        <Native0Text bold text="Room owner:" width={80} x={5} y={2} />
                        <Native0Text bold text="Users in room:" width={90} x={5} y={15} />
                        <Native0Text bold text="Owner in room:" width={90} x={5} y={28} />
                        <Native0Text bold text="Has event:" width={90} x={5} y={41} />
                        <Native0Text text={data ? data.ownerName : 'sulka'} underline width={71} x={85} y={2} onClick={data ? () => onOpenUserInfo(data.ownerId) : undefined} />
                        <Native0Text text={data ? `${data.userCount}` : '18'} width={40} x={100} y={15} />
                        <Native0Text text={data ? (data.ownerInRoom ? 'Yes' : 'No') : 'yes'} width={40} x={100} y={28} />
                        <Native0Text text="no" width={40} x={100} y={41} />
                        <Native0Button height={21} label="Enter room" width={70} x={155} y={4} onClick={() => data && TryVisitRoom(data.flatId)} />
                        <Native0Button enabled={settings.chatlogsPermission} height={21} label="Chatlog" width={70} x={155} y={26} onClick={() => data && onOpenChatlog(data.flatId)} />
                        <Native0Button
                            height={21}
                            label="Edit in HK"
                            width={70}
                            x={155}
                            y={48}
                            onClick={() => {
                                const prefix = GetConfiguration().getValue<string>('roomadmin.url');

                                if (data && prefix) OpenUrl(`${prefix}${data.flatId}`);
                            }}
                        />
                    </Native0Border>
                    <Native0Border {...eventCont} y={row.event}>
                        <Native0Text color={0x808080} text={localizeWithFallback('modtools.native.roomid', `Room id: ${roomId}`, ['id'], [`${roomId}`])} width={150} x={5} y={1} />
                        <Native0Text bold text={localizeWithFallback('modtools.native.refresh', 'Refresh')} underline width={60} x={170} y={1} onClick={refresh} />
                    </Native0Border>
                    <Native0Border {...actCont} y={row.act}>
                        <Native0Checkbox checked={kick} enabled={settings.roomKickPermission} x={5} y={5} onToggle={() => setKick((value) => !value)} />
                        <Native0Checkbox checked={lock} x={5} y={30} onToggle={() => setLock((value) => !value)} />
                        <Native0Checkbox checked={changeName} x={5} y={54} onToggle={() => setChangeName((value) => !value)} />
                        <Native0Text text={nativeCaption(act.children[3])} wrap width={199} x={24} y={5} />
                        <Native0Text text={nativeCaption(act.children[4])} width={199} x={24} y={31} />
                        <Native0Text text={nativeCaption(act.children[5])} wrap width={199} x={24} y={48} />
                    </Native0Border>
                    <Native0Input
                        active={inputActive}
                        height={input.height}
                        value={message}
                        width={input.width}
                        x={0}
                        y={row.input}
                        onChange={(value) => setMessage(value)}
                        onFocus={() => {
                            // _r2dd96fef5d4368: the first focus clears the placeholder text
                            if (isPlaceholder) {
                                setMessage('');
                                setIsPlaceholder(false);
                            }

                            setInputActive(true);
                        }}
                    />
                    <div style={{ position: 'absolute', left: 0, top: row.footer }}>
                        <Native0Button enabled={canAct} height={21} label="Send Caution" width={97} x={0} y={0} onClick={() => send(true)} />
                        <Native0Button enabled={canAct} height={21} label="Send message" width={97} x={131} y={0} onClick={() => send(false)} />
                    </div>
                    <Native0Dropmenu
                        caption={selectedTemplate >= 0 ? templates[selectedTemplate] : menuCaption}
                        height={menu.height}
                        items={templates}
                        width={menu.width}
                        x={0}
                        y={row.menu}
                        onSelect={(index) => {
                            // _rd853b7a3367fa7: choosing a template puts its text in the message field
                            setSelectedTemplate(index);
                            setMessage(templates[index]);
                            setIsPlaceholder(false);
                            setInputActive(true);
                        }}
                    />
                </div>
            </Native0Frame>
        </NativeWindowShell>
    );
};
