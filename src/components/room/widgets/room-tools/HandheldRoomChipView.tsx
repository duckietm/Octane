import { FC } from 'react';

/** RoomObjectType.USER: the entries of the room's unit list that are people (not pets, bots or rentable bots). */
const UNIT_TYPE_PERSON = 1;

interface HandheldRoomChipViewProps {
    roomName: string;
    /** The room's live unit list. */
    users: ReadonlyArray<{ type: number }>;
    /** The count the room data came with, shown until the unit list arrives. */
    fallbackUserCount: number;
    /** The player may still like this room. */
    canLike: boolean;
    /** The player liked the room during this visit. */
    liked: boolean;
}

/** People in the room: the live list once it is known, else what the room data said. */
export const countRoomPeople = (users: ReadonlyArray<{ type: number }>, fallback: number): number => {
    const people = users.reduce((total, user) => total + (user.type === UNIT_TYPE_PERSON ? 1 : 0), 0);

    return people > 0 ? people : Math.max(0, fallback);
};

/**
 * What the phone's room chip shows inside the room tools handle, a glass capsule that matches the purse: the house
 * in a round well, the room's name, how many people are in it and the like heart (hollow while the room can still be
 * liked, red once liked), with the chevron that says it opens a menu. Drawn with our toolbar house and inline shapes.
 */
export const HandheldRoomChipView: FC<HandheldRoomChipViewProps> = ({ roomName, users, fallbackUserCount, canLike, liked }) => (
    <>
        <span aria-hidden="true" className="octane-handheld-room-chip__well">
            <span className="octane-handheld-room-chip__house octane-icon icon-house" />
        </span>
        <span className="octane-handheld-room-chip__text">
            <span className="octane-handheld-room-chip__name">{roomName}</span>
            <span className="octane-handheld-room-chip__facts">
                <svg aria-hidden="true" className="octane-handheld-room-chip__people" viewBox="0 0 10 10">
                    <circle cx="5" cy="2.6" r="2.3" />
                    <path d="M0.6 10 C0.6 6.9 2.4 5.6 5 5.6 C7.6 5.6 9.4 6.9 9.4 10 Z" />
                </svg>
                <span className="octane-handheld-room-chip__count">{countRoomPeople(users, fallbackUserCount)}</span>
                <svg
                    aria-hidden="true"
                    className={`octane-handheld-room-chip__heart${liked ? ' is-liked' : ''}${canLike ? ' is-open' : ''}`}
                    data-like={liked ? 'liked' : canLike ? 'open' : 'none'}
                    viewBox="0 0 12 11"
                >
                    <path d="M6 10.2 L1.2 5.6 C-0.1 4.2 0.3 1.9 2 1.1 C3.4 0.4 5 0.9 6 2.3 C7 0.9 8.6 0.4 10 1.1 C11.7 1.9 12.1 4.2 10.8 5.6 Z" />
                </svg>
            </span>
        </span>
        <svg aria-hidden="true" className="octane-handheld-room-chip__arrow" viewBox="0 0 12 8">
            <path d="M1.5 1.5 L6 6 L10.5 1.5" />
        </svg>
    </>
);
