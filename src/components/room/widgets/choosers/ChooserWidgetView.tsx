import { FurniturePickupAllComposer } from '@octane/renderer';
import { FC, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { chooserSelectionVisualizer, LocalizeText, RoomObjectItem, SendMessageComposer } from '../../../../api';
import { Button, Flex, InfiniteScroll, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useHasPermission } from '../../../../hooks';
import { classNames, OctaneInput } from '../../../../layout';

const LIMIT_FURNI_PICKALL = 100;

interface ChooserWidgetViewProps {
    title: string;
    items: RoomObjectItem[];
    selectItem: (item: RoomObjectItem) => void;
    onClose: () => void;
    pickallFurni?: boolean;
    type?: 'furni' | 'users';
}

export const ChooserWidgetView: FC<ChooserWidgetViewProps> = (props) => {
    const { title = null, items = [], selectItem = null, onClose = null, pickallFurni = false, type = 'furni' } = props;
    const [selectedItems, setSelectedItems] = useState<RoomObjectItem[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [checkAll, setCheckAll] = useState(false);
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const canSeeId = useHasPermission('acc_supporttool');

    const ownerNames = useMemo(() => {
        const names = Array.from(new Set(items.map((item) => item.ownerName || 'Unknown')));
        return names.sort();
    }, [items]);

    const [selectedFilter, setSelectedFilter] = useState(() => {
        if (pickallFurni) return 'all';
        return ownerNames.length > 0 ? ownerNames[0] : '';
    });

    useEffect(() => {
        if (!pickallFurni && ownerNames.length > 0 && !selectedFilter) setSelectedFilter(ownerNames[0]);
    }, [pickallFurni, ownerNames, selectedFilter]);

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
        SendMessageComposer(new FurniturePickupAllComposer(...checkedIds));
        setCheckedIds([]);
        setCheckAll(false);
        chooserSelectionVisualizer.clearAll();
        setSelectedItems([]);
    };

    const filteredItems = useMemo(() => {
        const value = searchValue.toLocaleLowerCase();

        return items
            .filter((item) => {
                const matchesSearch = item.name?.toLocaleLowerCase().includes(value);
                const matchesFilter = !pickallFurni
                    ? selectedFilter
                        ? item.ownerName === selectedFilter
                        : true
                    : selectedFilter === 'all' || item.ownerName === selectedFilter;
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [items, searchValue, selectedFilter, pickallFurni]);

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

    return (
        <OctaneCardView className="w-[420px] h-[400px]" theme="primary-slim">
            <OctaneCardHeaderView headerText={title + ' (' + filteredItems.length + ')'} onCloseClick={handleClose} />
            <OctaneCardContentView overflow="hidden" gap={1}>
                <Flex gap={2}>
                    <OctaneInput
                        type="text"
                        placeholder={LocalizeText('generic.search')}
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                    />
                    {pickallFurni && (
                        <select className="form-control form-control-sm" value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)}>
                            <option value="all">{LocalizeText('roomsettings.access_rights.anyone')}</option>
                            {ownerNames.length > 0 ? (
                                ownerNames.map((value, index) => (
                                    <option key={index} value={value}>
                                        {value}
                                    </option>
                                ))
                            ) : (
                                <option disabled>No owners found</option>
                            )}
                        </select>
                    )}
                </Flex>
                {pickallFurni && (
                    <Flex gap={2}>
                        <input className="form-check-input" type="checkbox" checked={checkAll} onChange={() => checkedId()} />
                        <Text>{LocalizeText('widget.chooser.checkall')}</Text>
                    </Flex>
                )}
                <InfiniteScroll
                    rows={filteredItems}
                    rowRender={(row) => (
                        <Flex
                            alignItems="center"
                            className={classNames('rounded p-1', selectedItems.some((item) => item.id === row.id) && 'bg-muted')}
                            pointer
                            onClick={() => {
                                toggleItemSelection(row);
                                if (pickallFurni) checkedId(row.id);
                            }}
                        >
                            {pickallFurni && (
                                <input
                                    className="shrink-0 mx-1 form-check-input"
                                    type="checkbox"
                                    checked={isChecked(row.id)}
                                    onChange={() => checkedId(row.id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleItemSelection(row);
                                    }}
                                />
                            )}
                            <Text truncate>
                                {row.name}
                                {canSeeId && ' - ' + row.id}
                                {type === 'furni' && row.ownerName && row.ownerName !== '-' && ` (Owner: ${row.ownerName})`}
                            </Text>
                        </Flex>
                    )}
                />
                {pickallFurni && (
                    <Button variant="secondary" onClick={onClickPickAll} disabled={!checkedIds.length}>
                        {LocalizeText('widget.chooser.btn.pickall')}
                    </Button>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
