import { FriendCategoryData } from '@octane/renderer';
import { FC } from 'react';
import { countFriendsByCategory, LocalizeText, MessengerFriend } from '../../../../api';

interface FriendsListGroupChipsViewProps {
    categories: FriendCategoryData[];
    friends: MessengerFriend[];
    selectedCategoryId: number;
    setSelectedCategoryId: (id: number) => void;
    onManageClick: () => void;
}

export const FriendsListGroupChipsView: FC<FriendsListGroupChipsViewProps> = ({ categories = [], friends = [], selectedCategoryId = 0, setSelectedCategoryId, onManageClick }) => {
    const counts = countFriendsByCategory(friends);

    return <div className="friends-group-chips">
        <div className="friends-group-chips-scroll">
            <button type="button" className={`friends-group-chip${selectedCategoryId === 0 ? ' active' : ''}`} onClick={() => setSelectedCategoryId(0)}>
                {LocalizeText('friendlist.friends')} ({friends.length})
            </button>
            {categories.map((category) => <button key={category.id} type="button" className={`friends-group-chip${selectedCategoryId === category.id ? ' active' : ''}`} onClick={() => setSelectedCategoryId(category.id)}>
                {category.name} ({counts.get(category.id) ?? 0})
            </button>)}
        </div>
        <button type="button" className="friends-group-chip friends-group-chip-manage" title={LocalizeText('friendlist.friends')} onClick={onManageClick} />
    </div>;
};
