import { FurniturePickupAllComposer, RoomObjectCategory } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { chooserSelectionVisualizer, localizeWithFallback, RoomObjectItem, SendMessageComposer } from '../../../../api';
import { IsBuildersClubFurniId, IsTemporaryFurniId } from '../../../../api/utils/FurniIdBand';
import { Button, InfiniteScroll, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurniPickupGuard } from '../../../../hooks';
import { classNames, OctaneInput } from '../../../../layout';

const LIMIT_FURNI_PICKALL = 100;

/** Official FurniChooserTableObject: Builders Club and temporary (Wired) furni show "-" in the owner column. */
const furniOwnerCell = (item: RoomObjectItem) => {
    if (IsBuildersClubFurniId(item.id) || IsTemporaryFurniId(item.id)) return '-';

    return item.ownerName && item.ownerName !== '-' ? item.ownerName : '';
};

/** The menu's "all" entry; owner names go in with a prefix so an owner called "all" keeps its own entry. */
const FILTER_ALL = '';
const OWNER_FILTER_PREFIX = 'owner:';

/** AIR UsersView type menu: all, Habbo, pet and bot. Its third entry filters on user type 4 (populateWithFilters). */
const USER_TYPE_FILTERS = ['1', '2', '4'];
const USER_TYPE_FALLBACKS: Record<string, string> = { '1': 'Habbo', '2': 'Pet', '3': 'Bot', '4': 'Bot' };

/** AIR UsersChooserTableObject: the type cell reads `${new_user_chooser.usertype.<type>}`. */
export const userTypeLabel = (type: string) => localizeWithFallback(`new_user_chooser.usertype.${type}`, USER_TYPE_FALLBACKS[type] ?? type);

/** Floor and wall furni can share an id: rows, picks and highlights are told apart by category too. */
export const chooserItemKey = (item: RoomObjectItem) => `${item.category}:${item.id}`;

interface ChooserWidgetViewProps {
    title: string;
    items: RoomObjectItem[];
    selectItem: (item: RoomObjectItem) => void;
    onClose: () => void;
    pickallFurni?: boolean;
    type?: 'furni' | 'users';
}

/* The user and furni choosers of the official client: a search box and a menu on top, a table with
   its column heads, and the number found at the foot. The users are told apart by their type, the
   furni by their owner. A click selects one row (AIR TableView onRowClicked -> choose); the pick-up
   checkboxes are our own addition to the furni chooser. */
export const ChooserWidgetView: FC<ChooserWidgetViewProps> = (props) => {
    const { title = null, items = [], selectItem = null, onClose = null, pickallFurni = false, type = 'furni' } = props;
    const [searchValue, setSearchValue] = useState('');
    const [selectedKey, setSelectedKey] = useState<string>(null);
    const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
    const [selectedFilter, setSelectedFilter] = useState(FILTER_ALL);
    const { confirmIfWebApiBox } = useFurniPickupGuard();
    const isUsers = type === 'users';

    const ownerNames = useMemo(() => Array.from(new Set(items.map((item) => item.ownerName || 'Unknown'))).sort(), [items]);

    const filteredItems = useMemo(() => {
        const value = searchValue.toLocaleLowerCase();

        return items
            .filter((item) => {
                const matchesSearch = item.name?.toLocaleLowerCase().includes(value);
                const matchesFilter =
                    selectedFilter === FILTER_ALL ||
                    (isUsers ? item.type === selectedFilter : OWNER_FILTER_PREFIX + (item.ownerName || 'Unknown') === selectedFilter);

                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => a.name.toLocaleUpperCase().localeCompare(b.name.toLocaleUpperCase()) || a.id - b.id);
    }, [items, searchValue, selectedFilter, isUsers]);

    const highlight = (keys: string[]) => {
        chooserSelectionVisualizer.clearAll();
        items.filter((item) => keys.includes(chooserItemKey(item))).forEach((item) => chooserSelectionVisualizer.show(item.id, item.category));
    };

    const updateChecked = (keys: string[]) => {
        setCheckedKeys(keys);
        highlight(keys);
    };

    const checkedItems = items.filter((item) => checkedKeys.includes(chooserItemKey(item)));
    const checkableItems = filteredItems.slice(0, LIMIT_FURNI_PICKALL);
    const allChecked = checkableItems.length > 0 && checkableItems.every((item) => checkedKeys.includes(chooserItemKey(item)));

    const toggleChecked = (item: RoomObjectItem) => {
        const key = chooserItemKey(item);

        if (checkedKeys.includes(key)) updateChecked(checkedKeys.filter((value) => value !== key));
        else if (checkedKeys.length < LIMIT_FURNI_PICKALL) updateChecked([...checkedKeys, key]);
    };

    const choose = (item: RoomObjectItem) => {
        setSelectedKey(chooserItemKey(item));
        selectItem?.(item);

        if (pickallFurni) {
            toggleChecked(item);
            return;
        }

        highlight([chooserItemKey(item)]);
    };

    const onClickPickAll = () => {
        // The pick-up packet carries floor furni ids only.
        const ids = checkedItems.filter((item) => item.category === RoomObjectCategory.FLOOR).map((item) => item.id);

        if (!ids.length) return;

        confirmIfWebApiBox(ids, RoomObjectCategory.FLOOR, () => {
            SendMessageComposer(new FurniturePickupAllComposer(...ids));
            updateChecked([]);
            setSelectedKey(null);
        });
    };

    const handleClose = () => {
        chooserSelectionVisualizer.clearAll();
        setSelectedKey(null);
        setCheckedKeys([]);
        onClose();
    };

    const foundText = (isUsers ? localizeWithFallback('new_user_chooser.amount_indicator', '%amount% users found') : localizeWithFallback('new_furni_chooser.amount_indicator', '%amount% items found')).replace(/%amount%/g, String(filteredItems.length));
    const filterOptions = isUsers
        ? USER_TYPE_FILTERS.map((value) => ({ value, label: userTypeLabel(value) }))
        : ownerNames.map((name) => ({ value: OWNER_FILTER_PREFIX + name, label: name }));
    const isRowSelected = (row: RoomObjectItem) => (pickallFurni ? checkedKeys.includes(chooserItemKey(row)) : selectedKey === chooserItemKey(row));

    return (
        <OctaneCardView className={classNames('octane-chooser', isUsers ? 'w-[290px] h-[357px]' : 'w-[413px] h-[354px]')} theme="primary-slim">
            <OctaneCardHeaderView headerText={title} onCloseClick={handleClose} />
            <OctaneCardContentView overflow="hidden" gap={1}>
                <div className="octane-chooser-bar">
                    <div className="relative grow">
                        <OctaneInput
                            type="text"
                            placeholder={localizeWithFallback('new_chooser.search', 'Search')}
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                        />
                        {searchValue.length > 0 && (
                            <button
                                aria-label={localizeWithFallback('generic.clear', 'Clear')}
                                className="octane-chooser-clear"
                                type="button"
                                onClick={() => setSearchValue('')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <select
                        aria-label={isUsers ? localizeWithFallback('new_user_chooser.col.type', 'Type') : localizeWithFallback('new_furni_chooser.col.owner', 'Owner')}
                        className={classNames('octane-chooser-filter', !isUsers && 'octane-chooser-filter-wide')}
                        value={selectedFilter}
                        onChange={(event) => setSelectedFilter(event.target.value)}
                    >
                        <option value={FILTER_ALL}>
                            {isUsers ? localizeWithFallback('new_user_chooser.usertype.all', 'All types') : localizeWithFallback('new_furni_chooser.owner_selector.default', 'All owners')}
                        </option>
                        {filterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="octane-chooser-table">
                    <div className="octane-chooser-row octane-chooser-head">
                        {pickallFurni && (
                            <input
                                aria-label={localizeWithFallback('widget.chooser.checkall', 'Select all')}
                                checked={allChecked}
                                className="octane-chooser-check form-check-input"
                                type="checkbox"
                                onChange={() => updateChecked(allChecked ? [] : checkableItems.map(chooserItemKey))}
                            />
                        )}
                        <span className="octane-chooser-cell grow">{isUsers ? localizeWithFallback('new_user_chooser.col.name', 'Name') : localizeWithFallback('new_furni_chooser.col.name', 'Name')}</span>
                        <span className={classNames('octane-chooser-cell', isUsers ? 'w-[90px]' : 'w-[120px]')}>
                            {isUsers ? localizeWithFallback('new_user_chooser.col.type', 'Type') : localizeWithFallback('new_furni_chooser.col.owner', 'Owner')}
                        </span>
                        {!isUsers && <span className="octane-chooser-cell w-[90px]">{localizeWithFallback('new_furni_chooser.col.id', 'ID')}</span>}
                    </div>
                    <div className="octane-chooser-body">
                        <InfiniteScroll
                            rows={filteredItems}
                            rowRender={(row) => (
                                <div
                                    aria-selected={isRowSelected(row)}
                                    className={classNames('octane-chooser-row octane-chooser-item', isRowSelected(row) && 'is-selected')}
                                    role="row"
                                    onClick={() => choose(row)}
                                >
                                    {pickallFurni && (
                                        <input
                                            checked={checkedKeys.includes(chooserItemKey(row))}
                                            className="octane-chooser-check form-check-input"
                                            type="checkbox"
                                            onChange={() => toggleChecked(row)}
                                            onClick={(event) => event.stopPropagation()}
                                        />
                                    )}
                                    <span className="octane-chooser-cell grow truncate">{row.name}</span>
                                    <span className={classNames('octane-chooser-cell truncate', isUsers ? 'w-[90px]' : 'w-[120px]')}>
                                        {isUsers ? userTypeLabel(row.type) : furniOwnerCell(row)}
                                    </span>
                                    {!isUsers && <span className="octane-chooser-cell w-[90px] truncate">{row.id}</span>}
                                </div>
                            )}
                        />
                    </div>
                </div>
                {pickallFurni && (
                    <Button variant="secondary" onClick={onClickPickAll} disabled={!checkedItems.some((item) => item.category === RoomObjectCategory.FLOOR)}>
                        {localizeWithFallback('widget.chooser.btn.pickall', 'Pick up selected')}
                    </Button>
                )}
                <div className="octane-chooser-amount">{foundText}</div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
