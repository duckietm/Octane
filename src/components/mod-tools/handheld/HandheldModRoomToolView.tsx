import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Checkbox } from '../../../common/Checkbox';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Select } from '../../../common/Select';
import {
    HandheldModButton,
    HandheldModFacts,
    HandheldModHeading,
    HandheldModNote,
    HandheldModPage,
    handheldModLoading,
    useHandheldModPageTitle
} from './HandheldModPage';

export interface HandheldModRoomCheck {
    id: string;
    label: string;
    checked: boolean;
    enabled: boolean;
    onToggle: () => void;
}

interface HandheldModRoomToolViewProps {
    title: string;
    roomId: number;
    /** Null until the answer for this room arrives. */
    room: { exists: boolean; name: string; desc: string; tags: string[]; ownerName: string; userCount: number; ownerInRoom: boolean } | null;
    chatlogEnabled: boolean;
    editEnabled: boolean;
    /** The moderator is in this very room and may alert it: the sends work. */
    canAct: boolean;
    checks: HandheldModRoomCheck[];
    templates: string[];
    selectedTemplate: number;
    templateCaption: string;
    message: string;
    placeholder: string;
    onMessage: (value: string) => void;
    onMessageFocus: () => void;
    onTemplate: (index: number) => void;
    onOwner: () => void;
    onEnter: () => void;
    onChatlog: () => void;
    onEdit: () => void;
    onRefresh: () => void;
    onCaution: () => void;
    onSendMessage: () => void;
    onClose: () => void;
}

/**
 * The room tool on a phone (RoomToolView's twin): the room (name, description, tags), its owner and head count with
 * Enter / Chatlog / Edit in HK, the kick, doorbell and name checks, a message (typed or from a template) and the two sends
 * in a bar at the bottom. Every rule and packet stays in RoomToolView.
 */
export const HandheldModRoomToolView: FC<HandheldModRoomToolViewProps> = (props) => {
    const { title, roomId, room, chatlogEnabled, editEnabled, canAct, checks, templates, selectedTemplate, templateCaption, message, placeholder } = props;
    const { onMessage, onMessageFocus, onTemplate, onOwner, onEnter, onChatlog, onEdit, onRefresh, onCaution, onSendMessage, onClose } = props;
    const yes = localizeWithFallback('generic.yes', 'Yes');
    const no = localizeWithFallback('generic.no', 'No');
    const notHere = localizeWithFallback('octane.handheld.mod_tools.not_this_room', 'Only for the room you are in');

    useHandheldModPageTitle(room?.exists ? room.name : null);

    return (
        <NativeTextTree>
            <HandheldModPage
                className="is-room"
                footer={
                    <>
                        <HandheldModButton
                            disabled={!canAct}
                            hint={room ? notHere : undefined}
                            label={localizeWithFallback('octane.mod_tools.send_caution', 'Send Caution')}
                            testId="mod-room-caution"
                            tone="danger"
                            onClick={onCaution}
                        />
                        <HandheldModButton
                            disabled={!canAct}
                            hint={room ? notHere : undefined}
                            label={localizeWithFallback('octane.mod_tools.send_message', 'Send message')}
                            testId="mod-room-message"
                            tone="primary"
                            onClick={onSendMessage}
                        />
                    </>
                }
                subtitle={localizeWithFallback('modtools.native.roomid', `Room id: ${roomId}`, ['id'], [`${roomId}`])}
                title={title}
                onClose={onClose}
            >
                {!room && (
                    <div className="octane-handheld-modtools__card">
                        <HandheldModNote text={handheldModLoading()} />
                    </div>
                )}
                {room?.exists && (
                    <div className="octane-handheld-modtools__card octane-handheld-modtools__room" data-testid="mod-room">
                        <span className="octane-handheld-modtools__room-name">{room.name}</span>
                        {room.desc && <span className="octane-handheld-modtools__room-desc">{room.desc}</span>}
                        {room.tags.length > 0 && (
                            <span className="octane-handheld-modtools__room-tags">
                                {room.tags.map((tag) => (
                                    <span key={tag} className="octane-handheld-modtools__tag">
                                        {tag}
                                    </span>
                                ))}
                            </span>
                        )}
                    </div>
                )}
                {room && (
                    <div className="octane-handheld-modtools__card">
                        <HandheldModFacts
                            facts={[
                                {
                                    label: localizeWithFallback('octane.mod_tools.room_owner', 'Room owner:'),
                                    value: room.ownerName,
                                    action: { label: localizeWithFallback('octane.mod_tools.user_info', 'User Info'), onClick: onOwner }
                                },
                                { label: localizeWithFallback('octane.mod_tools.users_in_room', 'Users in room:'), value: `${room.userCount}` },
                                { label: localizeWithFallback('octane.mod_tools.owner_in_room', 'Owner in room:'), value: room.ownerInRoom ? yes : no }
                            ]}
                        />
                    </div>
                )}
                <div className="octane-handheld-modtools__actions">
                    <HandheldModButton
                        disabled={!room}
                        label={localizeWithFallback('octane.mod_tools.enter_room', 'Enter room')}
                        testId="mod-room-enter"
                        onClick={onEnter}
                    />
                    <HandheldModButton
                        disabled={!room || !chatlogEnabled}
                        label={localizeWithFallback('octane.mod_tools.chatlog', 'Chatlog')}
                        testId="mod-room-chatlog"
                        onClick={onChatlog}
                    />
                    <HandheldModButton
                        disabled={!room || !editEnabled}
                        label={localizeWithFallback('octane.mod_tools.edit_in_hk', 'Edit in HK')}
                        testId="mod-room-edit"
                        onClick={onEdit}
                    />
                    <HandheldModButton label={localizeWithFallback('modtools.native.refresh', 'Refresh')} testId="mod-room-refresh" onClick={onRefresh} />
                </div>
                <HandheldModHeading text={localizeWithFallback('octane.handheld.mod_tools.room_actions', 'With the message')} />
                <div className="octane-handheld-modtools__card octane-handheld-modtools__checks">
                    {checks.map((check) => (
                        <label key={check.id} className="octane-handheld-modtools__check" data-disabled={!check.enabled}>
                            <Checkbox checked={check.checked} disabled={!check.enabled} onCheckedChange={() => check.onToggle()} />
                            <span>{check.label}</span>
                        </label>
                    ))}
                </div>
                {templates.length > 0 && (
                    <Select
                        aria-label={templateCaption}
                        className="octane-handheld-modtools__select"
                        value={String(selectedTemplate)}
                        onChange={(event) => {
                            const index = Number(event.target.value);

                            if (index >= 0) onTemplate(index);
                        }}
                    >
                        <option value="-1">{templateCaption}</option>
                        {templates.map((template, index) => (
                            <option key={index} value={String(index)}>
                                {template}
                            </option>
                        ))}
                    </Select>
                )}
                <textarea
                    aria-label={placeholder}
                    className="octane-handheld-modtools__field is-area"
                    data-testid="mod-room-text"
                    placeholder={placeholder}
                    value={message}
                    onChange={(event) => onMessage(event.target.value)}
                    onFocus={onMessageFocus}
                />
            </HandheldModPage>
        </NativeTextTree>
    );
};
