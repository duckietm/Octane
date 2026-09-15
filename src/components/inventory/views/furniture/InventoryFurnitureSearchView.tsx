import { Dispatch, FC, KeyboardEvent, SetStateAction, useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { GroupItem, LocalizeText } from '../../../../api';
import { OctaneButton, OctaneInput } from '../../../../layout';

export const InventoryFurnitureSearchView: FC<{
    groupItems: GroupItem[];
    setGroupItems: Dispatch<SetStateAction<GroupItem[]>>;
}> = (props) => {
    const { groupItems = [], setGroupItems = null } = props;
    const [searchValue, setSearchValue] = useState('');
    // FurniView.as:822-828: the field only runs the search on Enter (or the search button);
    // Escape empties it and runs it again.
    const [draft, setDraft] = useState('');

    const onKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setDraft('');
            setSearchValue('');

            return;
        }

        if (event.key === 'Enter') setSearchValue(draft);
    };

    useEffect(() => {
        let filteredGroupItems = [...groupItems];

        if (searchValue && searchValue.length) {
            const comparison = searchValue.toLocaleLowerCase();

            filteredGroupItems = groupItems.filter((item) => {
                if (comparison && comparison.length) {
                    if (item.name.toLocaleLowerCase().includes(comparison)) return item;
                }

                return null;
            });
        }

        setGroupItems(filteredGroupItems);
    }, [groupItems, setGroupItems, searchValue]);

    return (
        <div className="flex gap-1">
            <OctaneInput
                data-testid="inventory-trade-search"
                placeholder={LocalizeText('generic.search')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyUp={onKeyUp}
            />
            <OctaneButton onClick={() => setSearchValue(draft)}>
                <FaSearch className="fa-icon" />
            </OctaneButton>
        </div>
    );
};
