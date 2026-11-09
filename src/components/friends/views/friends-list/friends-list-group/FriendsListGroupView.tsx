import { FC } from 'react';
import { MessengerFriend } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { FriendsListGroupItemView } from './FriendsListGroupItemView';

interface FriendsListGroupViewProps {
    list: MessengerFriend[];
    selectedFriendsIds: number[];
    selectFriend: (userId: number) => void;
    /** The list row of the first friend, for AIR's stripe over the whole list. */
    firstRowIndex?: number;
}

export const FriendsListGroupView: FC<FriendsListGroupViewProps> = (props) => {
    const { list = null, selectedFriendsIds = null, selectFriend = null, firstRowIndex = 1 } = props;

    if (!list || !list.length) return null;

    return (
        <NativeTextTree>
            <>
                {list.map((item, index) => (
                    <FriendsListGroupItemView
                        key={index}
                        friend={item}
                        odd={(firstRowIndex + index) % 2 === 1}
                        selected={selectedFriendsIds && selectedFriendsIds.indexOf(item.id) >= 0}
                        selectFriend={selectFriend}
                    />
                ))}
            </>
        </NativeTextTree>
    );
};
