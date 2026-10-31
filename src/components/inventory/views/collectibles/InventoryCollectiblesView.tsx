import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Select } from '../../../../common';
import { ToggleButton } from '../../../../common/ToggleButton';
import { CollectibleProductImageView } from '../../../collectibles/CollectibleProductImageView';
import {
    CollectibleGroup,
    filterCollectibleGroups,
    groupCollectibles,
    INVENTORY_FILTER_TYPES,
    PRODUCT_TYPE_FALLBACKS,
    productTypeKey
} from '../../../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName, useCollectibles } from '../../../../hooks/collectibles/useCollectibles';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const nameOf = (group: CollectibleGroup) => getCollectibleProductName(group.product);

const typeLabel = (productTypeId: number) => {
    const key = productTypeKey(productTypeId);

    return localizeWithFallback(key, PRODUCT_TYPE_FALLBACKS[key] ?? '');
};

/**
 * The inventory's collectibles tab (`inventory/collectibles/CollectiblesView`): the owned collectibles
 * grouped by product, a product type filter and a name search, and the picked one's preview.
 */
export const InventoryCollectiblesView: FC = () => {
    const { inventory = null, requestInventory = null } = useCollectibles();
    const [filterIndex, setFilterIndex] = useState(0);
    const [search, setSearch] = useState('');
    const [selectedCode, setSelectedCode] = useState<string>(null);

    useEffect(() => {
        requestInventory?.();
    }, [requestInventory]);

    const groups = useMemo(() => groupCollectibles(inventory ?? []), [inventory]);
    const shown = useMemo(() => filterCollectibleGroups(groups, filterIndex, search, nameOf), [groups, filterIndex, search]);
    const selected = shown.find((group) => group.productCode === selectedCode) ?? shown[0] ?? null;

    if (inventory === null) {
        return (
            <NativeTextTree>
                <div className="octane-inventory-collectibles-state" role="status">
                    {localizeWithFallback('generic.loading', 'Loading...')}
                </div>
            </NativeTextTree>
        );
    }

    if (!groups.length) {
        return (
            <NativeTextTree>
                <div className="octane-inventory-collectibles-state" data-testid="inventory-collectibles-empty">
                    {localizeWithFallback('inventory.empty.collectibles.title', 'You have no collectibles yet.')}
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-inventory-collectibles" data-testid="inventory-collectibles">
                <div className="octane-inventory-collectibles-options">
                    <input
                        aria-label={localizeWithFallback('generic.search', 'Search')}
                        className="octane-inventory-filter-input"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <Select
                        aria-label={localizeWithFallback('inventory.filter.option.everything', 'Everything')}
                        className="octane-inventory-collectibles-filter"
                        value={String(filterIndex)}
                        onChange={(event) => setFilterIndex(Number(event.target.value))}
                    >
                        <option value="0">{localizeWithFallback('inventory.filter.option.everything', 'Everything')}</option>
                        {INVENTORY_FILTER_TYPES.map((type, index) => (
                            <option key={type} value={String(index + 1)}>
                                {typeLabel(type)}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="octane-inventory-collectibles-body">
                    <div className="octane-inventory-collectibles-grid">
                        {shown.map((group) => (
                            <ToggleButton
                                key={group.productCode}
                                aria-label={nameOf(group)}
                                className={`octane-collectibles-item${selected?.productCode === group.productCode ? ' is-selected' : ''}`}
                                pressed={selected?.productCode === group.productCode}
                                onClick={() => setSelectedCode(group.productCode)}
                            >
                                <CollectibleProductImageView icon product={group.product} />
                                {group.assetIds.length > 1 && <span className="octane-collectibles-item-amount">{group.assetIds.length}</span>}
                            </ToggleButton>
                        ))}
                    </div>
                    {selected && (
                        <div className="octane-inventory-collectibles-preview">
                            <div className="octane-inventory-collectibles-image">
                                <CollectibleProductImageView product={selected.product} />
                            </div>
                            <div className="octane-inventory-collectibles-name" data-testid="inventory-collectibles-name">
                                {nameOf(selected)}
                            </div>
                            <div className="octane-inventory-collectibles-type">
                                {`${localizeWithFallback('collectibles.item.type', 'Type')}: ${typeLabel(selected.product.productTypeId)}`}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
