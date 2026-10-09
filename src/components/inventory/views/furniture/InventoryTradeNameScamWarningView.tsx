import { IRoomUserData, RoomObjectType } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { findLookalikeNames, GetUserProfile, localizeWithFallback, MessengerFriend } from '../../../../api';
import { LayoutAvatarImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFriendsState, useInventoryTrade, useRoomUserListSnapshot } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';

/** Seconds the warning stays up before it can be closed (official TradingNameScamWarningView). */
const CLOSE_LOCK_SECONDS = 6;

interface NameScamWarning {
    userId: number;
    userName: string;
    figure: string;
    similarInRoom: string[];
    similarInFriends: string[];
}

const findNameScamWarning = (
    userId: number,
    userName: string,
    roomUsers: ReadonlyArray<IRoomUserData>,
    friends: ReadonlyArray<MessengerFriend>
): NameScamWarning => {
    if (!userId || !userName) return null;

    const roomNames = roomUsers.filter((user) => user.type === RoomObjectType.USER && user.webID !== userId).map((user) => user.name);
    const friendNames = friends.filter((friend) => friend.id !== userId).map((friend) => friend.name);
    const similarInRoom = findLookalikeNames(userName, roomNames);
    const similarInFriends = findLookalikeNames(userName, friendNames);

    if (!similarInRoom.length && !similarInFriends.length) return null;

    const figure = roomUsers.find((user) => user.webID === userId)?.figure ?? '';

    return { userId, userName, figure, similarInRoom, similarInFriends };
};

/** Warns when the trade partner's name could pass for someone in the room or a friend ("B0b" for "Bob"). */
export const InventoryTradeNameScamWarningView: FC<{}> = () => {
    const [warning, setWarning] = useState<NameScamWarning>(null);
    const [lockSeconds, setLockSeconds] = useState(0);
    const { isTrading = false, otherUser = null } = useInventoryTrade();
    const { friends = [] } = useFriendsState();
    const roomUsers = useRoomUserListSnapshot();
    const otherUserId = isTrading ? (otherUser?.userId ?? 0) : 0;

    const [checkedUserId, setCheckedUserId] = useState(0);

    // Checked once when a trade opens, with the room and friends as they are at that moment.
    if (otherUserId !== checkedUserId) {
        const found = findNameScamWarning(otherUserId, otherUser?.userName, roomUsers, friends);

        setCheckedUserId(otherUserId);
        setWarning(found);
        setLockSeconds(found ? CLOSE_LOCK_SECONDS : 0);
    }

    useEffect(() => {
        if (lockSeconds <= 0) return;

        const timeout = setTimeout(() => setLockSeconds((seconds) => seconds - 1), 1000);

        return () => clearTimeout(timeout);
    }, [lockSeconds]);

    if (!warning) return null;

    const close = () => {
        if (lockSeconds <= 0) setWarning(null);
    };

    return (
        <OctaneCardView className="min-w-0 w-[min(356px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" uniqueKey="trade-name-scam">
            <OctaneCardHeaderView headerText={localizeWithFallback('inventory.trading.namescam.title', 'Check who you are trading with')} onCloseClick={close} />
            <div className="flex flex-col gap-2 bg-[#DFDFDF] p-2 text-sm">
                <p className="m-0">
                    {localizeWithFallback(
                        'inventory.trading.namescam.warning',
                        `The name ${warning.userName} looks a lot like someone you know. Make sure this is the person you meant to trade with.`,
                        ['trader_name'],
                        [warning.userName]
                    )}
                </p>
                <div className="flex items-center gap-2 rounded bg-white p-1">
                    <div className="h-[64px] w-[48px] shrink-0 overflow-hidden">
                        {warning.figure && <LayoutAvatarImageView direction={2} figure={warning.figure} headOnly />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs text-[#595959]">{localizeWithFallback('inventory.trading.namescam.trader', 'Trading with')}</span>
                        <span className="truncate font-bold">{warning.userName}</span>
                    </div>
                    <OctaneButton className="shrink-0 text-xs" onClick={() => GetUserProfile(warning.userId)}>
                        {localizeWithFallback('inventory.trading.namescam.open_profile', 'Profile')}
                    </OctaneButton>
                </div>
                {warning.similarInRoom.length > 0 && (
                    <div>
                        <span className="font-bold">{localizeWithFallback('inventory.trading.namescam.similar_in_room', 'Similar names in this room')}</span>
                        <ul className="m-0 pl-4">
                            {warning.similarInRoom.map((name) => (
                                <li key={name}>{name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {warning.similarInFriends.length > 0 && (
                    <div>
                        <span className="font-bold">{localizeWithFallback('inventory.trading.namescam.similar_in_friends', 'Similar names in your friends')}</span>
                        <ul className="m-0 pl-4">
                            {warning.similarInFriends.map((name) => (
                                <li key={name}>{name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="flex items-center justify-end gap-2">
                    {lockSeconds > 0 && (
                        <span className="text-xs text-[#595959]">
                            {localizeWithFallback('inventory.trading.namescam.close_countdown', `You can close this in ${lockSeconds} s`, ['seconds'], [String(lockSeconds)])}
                        </span>
                    )}
                    <OctaneButton disabled={lockSeconds > 0} onClick={close}>
                        {localizeWithFallback('inventory.trading.namescam.close', 'OK')}
                    </OctaneButton>
                </div>
            </div>
        </OctaneCardView>
    );
};
