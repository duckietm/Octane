import { FurniturePickupAllComposer, RoomObjectCategory } from '@octane/renderer';
import { FC, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { chooserSelectionVisualizer, localizeWithFallback, LocalizeText, RoomObjectItem, SendMessageComposer } from '../../../../api';
import { Button, InfiniteScroll, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurniPickupGuard } from '../../../../hooks';
import { classNames, OctaneInput } from '../../../../layout';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';
import { BaseButton } from '../../../../common/BaseButton';

const LIMIT_FURNI_PICKALL = 100;
const FILTER_ALL = 'all';

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
   furni by their owner. */
export const ChooserWidgetView: FC<ChooserWidgetViewProps> = (props) => {
    const { title = null, items = [], selectItem = null, onClose = null, pickallFurni = false, type = 'furni' } = props;
    const [selectedItems, setSelectedItems] = useState<RoomObjectItem[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [checkAll, setCheckAll] = useState(false);
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [selectedFilter, setSelectedFilter] = useState(FILTER_ALL);
    const { confirmIfWebApiBox } = useFurniPickupGuard();
    const isUsers = type === 'users';

    const filterValueOf = (item: RoomObjectItem) => (isUsers ? item.type : item.ownerName || 'Unknown');

    const filterValues = useMemo(() => Array.from(new Set(items.map((item) => (isUsers ? item.type : item.ownerName || 'Unknown')))).sort(), [items, isUsers]);

    const checkedId = (id?: number) => {
        if (id) {
            if (isChecked(id)) setCheckedIds(checkedIds.filter((x) => x !== id));
            else if (checkedIds.length < LIMIT_FURNI_PICKALL) setCheckedIds([...checkedIds, id]);
        } else {
            setCheckAll((value) => !value);

            if (!checkAll) {
                const allItems = filteredItems.slice(0, LIMIT_FURNI_PICKALL);
                setCheckedIds(allItems.map((x) => x.id));
                setSelectedItems(allItems);
            } else {
                setCheckedIds([]);
                setSelectedItems([]);
                chooserSelectionVisualizer.clearAll();
            }
        }
    };

    const isChecked = (id: number) => checkedIds.includes(id);

    const onClickPickAll = () => {
        const ids = [...checkedIds];

        confirmIfWebApiBox(ids, RoomObjectCategory.FLOOR, () => {
            SendMessageComposer(new FurniturePickupAllComposer(...ids));
            setCheckedIds([]);
            setCheckAll(false);
            chooserSelectionVisualizer.clearAll();
            setSelectedItems([]);
        });
    };

    const filteredItems = useMemo(() => {
        const value = searchValue.toLocaleLowerCase();

        return items
            .filter((item) => {
                const matchesSearch = item.name?.toLocaleLowerCase().includes(value);
                const matchesFilter = selectedFilter === FILTER_ALL || (isUsers ? item.type : item.ownerName || 'Unknown') === selectedFilter;

                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [items, searchValue, selectedFilter, isUsers]);

    const notifySelectionChange = useEffectEvent((items: RoomObjectItem[]) => {
        selectItem(items[items.length - 1]);

        chooserSelectionVisualizer.clearAll();
        items.forEach((item) => {
            if (item.id && item.category) chooserSelectionVisualizer.show(item.id, item.category);
        });
    });

    useEffect(() => {
        if (selectedItems.length === 0) return;

        notifySelectionChange(selectedItems);
    }, [selectedItems]);

    const toggleItemSelection = (item: RoomObjectItem) => {
        setSelectedItems((prev) => {
            if (prev.some((selected) => selected.id === item.id)) {
                chooserSelectionVisualizer.hide(item.id, item.category);
                return prev.filter((selected) => selected.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    const handleClose = () => {
        chooserSelectionVisualizer.clearAll();
        setSelectedItems([]);
        onClose();
    };

    const foundText = (isUsers ? localizeWithFallback('new_user_chooser.amount_indicator', '%amount% users found') : localizeWithFallback('new_furni_chooser.amount_indicator', '%amount% items found')).replace(/%amount%/g, String(filteredItems.length));

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
                            <BaseButton
                                aria-label={localizeWithFallback('generic.clear', 'Clear')}
                                className="octane-chooser-clear"
                                type="button"
                                onClick={() => setSearchValue('')}
                            >
                                ×
                            </BaseButton>
                        )}
                    </div>
                    <Select
                        aria-label={isUsers ? localizeWithFallback('widget.chooser.filter.type', 'Type') : localizeWithFallback('widget.chooser.filter.owner', 'Owner')}
                        className={classNames('octane-chooser-filter', !isUsers && 'octane-chooser-filter-wide')}
                        value={selectedFilter}
                        onChange={(event) => setSelectedFilter(event.target.value)}
                    >
                        <option value={FILTER_ALL}>
                            {isUsers ? localizeWithFallback('new_user_chooser.usertype.all', 'All types') : localizeWithFallback('new_furni_chooser.owner_selector.default', 'All owners')}
                        </option>
                        {filterValues.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="octane-chooser-table">
                    <div className="octane-chooser-row octane-chooser-head">
                        {pickallFurni && (
                            <Checkbox aria-label={LocalizeText('widget.chooser.checkall')} checked={checkAll} className="octane-chooser-check" onCheckedChange={() => checkedId()} />
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
                                    className={classNames('octane-chooser-row octane-chooser-item', selectedItems.some((item) => item.id === row.id) && 'is-selected')}
                                    onClick={() => {
                                        toggleItemSelection(row);
                                        if (pickallFurni) checkedId(row.id);
                                    }}
                                >
                                    {pickallFurni && (
                                        <Checkbox checked={isChecked(row.id)} className="octane-chooser-check" onCheckedChange={() => checkedId(row.id)} onClick={(e) => {
                                                e.stopPropagation();
                                                toggleItemSelection(row);
                                            }} />
                                    )}
                                    <span className="octane-chooser-cell grow truncate">{row.name}</span>
                                    <span className={classNames('octane-chooser-cell truncate', isUsers ? 'w-[90px]' : 'w-[120px]')}>
                                        {isUsers ? filterValueOf(row) : row.ownerName && row.ownerName !== '-' ? row.ownerName : ''}
                                    </span>
                                    {!isUsers && <span className="octane-chooser-cell w-[90px] truncate">{row.id}</span>}
                                </div>
                            )}
                        />
                    </div>
                </div>
                {pickallFurni && (
                    <Button variant="secondary" onClick={onClickPickAll} disabled={!checkedIds.length}>
                        {LocalizeText('widget.chooser.btn.pickall')}
                    </Button>
                )}
                <div className="octane-chooser-amount">{foundText}</div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
