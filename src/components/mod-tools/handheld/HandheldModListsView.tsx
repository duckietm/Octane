import { FC } from 'react';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HandheldModButton, HandheldModFacts, HandheldModNote, HandheldModPage, handheldModLoading } from './HandheldModPage';

interface HandheldModRoomVisitsViewProps {
    title: string;
    /** Null until the answer for this user arrives. */
    visits: { key: string; time: string; roomId: number; roomName: string }[] | null;
    enterLabel: string;
    roomToolLabel: string;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
    onClose: () => void;
}

/** A user's room visits on a phone (RoomVisitsView's twin): a card per visit with its time, the room tool and Enter. */
export const HandheldModRoomVisitsView: FC<HandheldModRoomVisitsViewProps> = ({
    title,
    visits,
    enterLabel,
    roomToolLabel,
    onOpenRoomTool,
    onEnterRoom,
    onClose
}) => (
    <NativeTextTree>
        <HandheldModPage className="is-visits" title={title} onClose={onClose}>
            {!visits && <HandheldModNote text={handheldModLoading()} />}
            <div className="octane-handheld-modtools__list" data-testid="mod-visits">
                {visits?.map((visit) => (
                    <div key={visit.key} className="octane-handheld-modtools__visit">
                        <span className="octane-handheld-modtools__visit-time">{visit.time}</span>
                        <BaseButton
                            aria-label={`${roomToolLabel}: ${visit.roomName}`}
                            className="octane-handheld-modtools__visit-room"
                            type="button"
                            onClick={() => onOpenRoomTool(visit.roomId)}
                        >
                            {visit.roomName}
                        </BaseButton>
                        <HandheldModButton label={enterLabel} onClick={() => onEnterRoom(visit.roomId)} />
                    </div>
                ))}
            </div>
        </HandheldModPage>
    </NativeTextTree>
);

interface HandheldModRecordsViewProps {
    title: string;
    /** Null until the answer arrives. */
    records: { key: string; fields: { label: string; value: string }[] }[] | null;
    notes: string[];
    onClose: () => void;
}

/** A user's cautions, bans, banned accounts or trade locks on a phone (UserRecordsView's twin): a card of rows per record. */
export const HandheldModRecordsView: FC<HandheldModRecordsViewProps> = ({ title, records, notes, onClose }) => (
    <NativeTextTree>
        <HandheldModPage className="is-records" title={title} onClose={onClose}>
            {!records && <HandheldModNote text={handheldModLoading()} />}
            <div className="octane-handheld-modtools__list" data-testid="mod-records">
                {records?.map((record) => (
                    <div key={record.key} className="octane-handheld-modtools__card" data-testid="user-record">
                        <HandheldModFacts facts={record.fields} />
                    </div>
                ))}
            </div>
            {notes.map((note) => (
                <HandheldModNote key={note} text={note} />
            ))}
        </HandheldModPage>
    </NativeTextTree>
);

interface HandheldModClassificationViewProps {
    title: string;
    entries: { userId: number; userName: string; classType: string }[];
    onOpenUserInfo: (userId: number) => void;
    onClose: () => void;
}

/** The room's user classification on a phone (UserClassificationView's twin): each user (to their info) with the class. */
export const HandheldModClassificationView: FC<HandheldModClassificationViewProps> = ({ title, entries, onOpenUserInfo, onClose }) => (
    <NativeTextTree>
        <HandheldModPage className="is-classification" title={title} onClose={onClose}>
            <div className="octane-handheld-modtools__list" data-testid="mod-classification">
                {entries.map((entry) => (
                    <BaseButton
                        key={entry.userId}
                        className="octane-handheld-modtools__visit is-user"
                        type="button"
                        onClick={() => onOpenUserInfo(entry.userId)}
                    >
                        <span className="octane-handheld-modtools__visit-room">{entry.userName}</span>
                        <span className="octane-handheld-modtools__tag">{entry.classType}</span>
                    </BaseButton>
                ))}
            </div>
        </HandheldModPage>
    </NativeTextTree>
);
