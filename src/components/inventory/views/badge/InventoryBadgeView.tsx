import { CreateLinkEvent, DeleteBadgeMessageComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaPaintBrush, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import {
    deleteCustomBadge,
    ensureBadgeLeaderboardLoaded,
    ensureCustomBadgeTexts,
    fetchCustomBadges,
    getCachedBadgeRarityStat,
    GetConfigurationValue,
    isCustomBadgeCode,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback,
    refreshCustomBadgeTexts,
    SendMessageComposer,
    UnseenItemCategory
} from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useInventoryBadges, useInventoryUnseenTracker, useNotification } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { useIsHandheld } from '../../../../hooks/handheld/useHandheldLayout';
import { HandheldInventoryAction, HandheldInventorySelectionView } from '../HandheldInventorySelectionView';
import { InventoryBadgeItemView } from './InventoryBadgeItemView';
import { BaseButton } from '../../../../common/BaseButton';
import { ToggleButton } from '../../../../common/ToggleButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const ActiveBadgeSlot: FC<{
    slotIndex: number;
    badgeCode?: string;
    onDropBadge: (badgeCode: string, slotIndex: number, sourceSlot?: number) => void;
    onDragStartFromSlot: (event: React.DragEvent, badgeCode: string, slotIndex: number) => void;
    onSelectBadge: (badgeCode: string) => void;
    isSelected: boolean;
}> = ({ slotIndex, badgeCode, onDropBadge, onDragStartFromSlot, onSelectBadge, isSelected }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <NativeTextTree>
            <div
                className={`octane-inventory-badge-slot ${badgeCode ? 'has-badge octane-inventory-thumb octane-inventory-badge-cell' : 'is-empty'} ${isSelected ? 'is-selected' : ''} ${isDragOver ? 'is-dragover' : ''}`}
                draggable={!!badgeCode}
                onDragEnd={() => undefined}
                onDragLeave={() => setIsDragOver(false)}
                onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setIsDragOver(true);
                }}
                onDragStart={(event) => {
                    if (!badgeCode) return;
                    onDragStartFromSlot(event, badgeCode, slotIndex);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragOver(false);
                    const droppedBadgeCode = event.dataTransfer.getData('badgeCode');
                    const sourceSlotStr = event.dataTransfer.getData('activeSlot');
                    const sourceSlot = sourceSlotStr !== '' ? parseInt(sourceSlotStr) : undefined;
                    if (droppedBadgeCode) onDropBadge(droppedBadgeCode, slotIndex, sourceSlot);
                }}
                onMouseDown={() => badgeCode && onSelectBadge(badgeCode)}
            >
                {badgeCode ? <LayoutBadgeImageView badgeCode={badgeCode} /> : null}
            </div>
        </NativeTextTree>
    );
};

export const InventoryBadgeView: FC<{ filteredBadgeCodes?: string[] }> = (props) => {
    const { filteredBadgeCodes = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const {
        badgeCodes = [],
        activeBadgeCodes = [],
        selectedBadgeCode = null,
        isWearingBadge = null,
        canWearBadges = null,
        toggleBadge = null,
        getBadgeId = null,
        setBadgeAtSlot = null,
        removeBadge = null,
        reorderBadges = null,
        setSelectedBadgeCode = null,
        activate = null,
        deactivate = null
    } = useInventoryBadges();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const { showConfirm = null } = useNotification();
    const isHandheld = useIsHandheld();
    const [isDragOverInventory, setIsDragOverInventory] = useState(false);
    const [isDraggingFromActive, setIsDraggingFromActive] = useState(false);
    const maxSlots = useMemo(() => GetConfigurationValue<number>('user.badges.max.slots', 5), []);
    const [ownCustomBadgeIds, setOwnCustomBadgeIds] = useState<Set<string>>(() => new Set());
    const [page, setPage] = useState(0);
    const [customFilter, setCustomFilter] = useState<'all' | 'custom'>('all');
    const [rarityStat, setRarityStat] = useState(() => (selectedBadgeCode ? getCachedBadgeRarityStat(selectedBadgeCode) : null));

    const refreshOwnCustomBadges = useCallback(async () => {
        try {
            const data = await fetchCustomBadges();
            setOwnCustomBadgeIds(new Set((data.badges ?? []).map((b) => b.badgeId)));
        } catch {
            setOwnCustomBadgeIds(new Set());
        }
    }, []);

    useEffect(() => {
        refreshOwnCustomBadges();
        ensureCustomBadgeTexts();
        ensureBadgeLeaderboardLoaded().catch(() => {});
    }, [refreshOwnCustomBadges]);

    useEffect(() => {
        if (!selectedBadgeCode) {
            setRarityStat(null);
            return;
        }
        setRarityStat(getCachedBadgeRarityStat(selectedBadgeCode));
        ensureBadgeLeaderboardLoaded()
            .then(() => setRarityStat(getCachedBadgeRarityStat(selectedBadgeCode)))
            .catch(() => {});
    }, [selectedBadgeCode]);

    const baseCodes = filteredBadgeCodes !== null ? filteredBadgeCodes : badgeCodes;
    const customCount = useMemo(() => baseCodes.filter((c) => isCustomBadgeCode(c)).length, [baseCodes]);
    const displayCodes = useMemo(() => (customFilter === 'custom' ? baseCodes.filter((c) => isCustomBadgeCode(c)) : baseCodes), [baseCodes, customFilter]);

    const inactiveCodes = displayCodes.filter((code) => !isWearingBadge(code));
    // AIR BadgeGridView uses pages of 200 and keeps the integer-division extra page.
    const pageCount = Math.floor(inactiveCodes.length / 200) + 1;
    const currentPage = Math.min(page, pageCount - 1);

    const isOwnCustomBadge = (code: string | null) => !!code && isCustomBadgeCode(code) && ownCustomBadgeIds.has(code);

    const handleEditCustom = useCallback(() => {
        if (!selectedBadgeCode) return;
        CreateLinkEvent(`badge-creator/edit/${selectedBadgeCode}`);
    }, [selectedBadgeCode]);

    const handleDeleteCustom = useCallback(() => {
        if (!selectedBadgeCode) return;
        const target = selectedBadgeCode;
        showConfirm(
            LocalizeText('inventory.delete.confirm_delete.info', ['furniname', 'amount'], [LocalizeBadgeName(target), '1']),
            async () => {
                try {
                    await deleteCustomBadge(target);
                    await refreshOwnCustomBadges();
                    refreshCustomBadgeTexts();
                } catch {
                    /* server surfaces errors */
                }
            },
            null,
            null,
            null,
            LocalizeText('inventory.delete.confirm_delete.title')
        );
    }, [selectedBadgeCode, showConfirm, refreshOwnCustomBadges]);

    const attemptDeleteBadge = () => {
        if (!selectedBadgeCode) return;
        showConfirm(
            LocalizeText('inventory.delete.confirm_delete.info', ['furniname', 'amount'], [LocalizeBadgeName(selectedBadgeCode), '1']),
            () => SendMessageComposer(new DeleteBadgeMessageComposer(selectedBadgeCode)),
            null,
            null,
            null,
            LocalizeText('inventory.delete.confirm_delete.title')
        );
    };

    const handleDropOnSlot = useCallback(
        (badgeCode: string, slotIndex: number, sourceSlot?: number) => {
            if (sourceSlot !== undefined) reorderBadges(sourceSlot, slotIndex);
            else setBadgeAtSlot(badgeCode, slotIndex);
        },
        [setBadgeAtSlot, reorderBadges]
    );

    const handleDragStartFromSlot = useCallback((event: React.DragEvent, badgeCode: string, slotIndex: number) => {
        event.dataTransfer.setData('badgeCode', badgeCode);
        event.dataTransfer.setData('activeSlot', slotIndex.toString());
        event.dataTransfer.setData('source', 'active');
        event.dataTransfer.effectAllowed = 'move';
        const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode);
        const img = new Image();
        img.src = badgeUrl;
        event.dataTransfer.setDragImage(img, 20, 20);
    }, []);

    useEffect(() => {
        if (!selectedBadgeCode || !isUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode))) return;
        removeUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode));
    }, [selectedBadgeCode, isUnseen, removeUnseen, getBadgeId]);

    useEffect(() => {
        if (!isVisible) return;
        const id = activate();
        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);
        return () => setIsVisible(false);
    }, []);

    const description = selectedBadgeCode ? LocalizeBadgeDescription(selectedBadgeCode) : '';
    const rarityLabel = rarityStat ? localizeWithFallback(`badge.rarity.${rarityStat.rarity}`, rarityStat.rarity) : '';
    const rarityText = rarityStat ? localizeWithFallback('badge.rarity.badge', `${rarityLabel} badge`, ['rarity'], [rarityLabel]) : '';

    // Phone layout: the badges worn, the all / custom switch, the grid, and the chosen badge as a bar with "wear badge"
    // (edit and delete behind "more"). A badge is put on with the button; dragging onto a slot stays a mouse thing.
    if (isHandheld) {
        const actions: HandheldInventoryAction[] = [];

        if (selectedBadgeCode && isOwnCustomBadge(selectedBadgeCode)) {
            actions.push({ key: 'edit', label: localizeWithFallback('octane.handheld.inventory.edit_badge', 'Edit badge'), onClick: handleEditCustom });
        }

        if (selectedBadgeCode && !isWearingBadge(selectedBadgeCode)) {
            actions.push({
                key: 'delete',
                label: LocalizeText('generic.delete'),
                danger: true,
                onClick: isOwnCustomBadge(selectedBadgeCode) ? handleDeleteCustom : attemptDeleteBadge
            });
        }

        const ownersText =
            rarityStat && rarityStat.ownerCount > 0 && rarityStat.ownerCount < 1000
                ? localizeWithFallback('badge.owner_count', `${rarityStat.ownerCount.toLocaleString()} owners`, ['count'], [rarityStat.ownerCount.toLocaleString()])
                : '';
        const hasDescription = !!description && description !== selectedBadgeCode;

        return (
            <NativeTextTree>
                <div className="octane-handheld-inv__pane is-badges">
                    <div className="octane-handheld-inv__wearing">
                        <span className="octane-handheld-inv__wearing-title">{localizeWithFallback('inventory.badges.activebadges', 'Wearing')}</span>
                        <div className="octane-handheld-inv__wearing-slots">
                            {Array.from({ length: maxSlots }).map((_, index) => (
                                <ActiveBadgeSlot
                                    key={index}
                                    badgeCode={activeBadgeCodes[index]}
                                    isSelected={selectedBadgeCode === activeBadgeCodes[index] && !!activeBadgeCodes[index]}
                                    slotIndex={index}
                                    onDropBadge={handleDropOnSlot}
                                    onDragStartFromSlot={handleDragStartFromSlot}
                                    onSelectBadge={setSelectedBadgeCode}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="octane-handheld-inv__chips">
                        <ToggleButton className="octane-handheld-inv__chip" pressed={customFilter === 'all'} onPressedChange={() => setCustomFilter('all')}>
                            {`${localizeWithFallback('inventory.badges.tab.all', 'All')} (${baseCodes.length})`}
                        </ToggleButton>
                        <ToggleButton className="octane-handheld-inv__chip" pressed={customFilter === 'custom'} onPressedChange={() => setCustomFilter('custom')}>
                            {`${localizeWithFallback('inventory.badges.tab.custom', 'Custom')} (${customCount})`}
                        </ToggleButton>
                        <BaseButton className="octane-handheld-inv__chip is-create" onClick={() => CreateLinkEvent('badge-creator/show')}>
                            {localizeWithFallback('inventory.badges.create', 'Create badge')}
                        </BaseButton>
                    </div>
                    <div className="octane-handheld-inv__gridbox">
                        <div key={currentPage} className="octane-handheld-inv__grid">
                            {inactiveCodes.slice(currentPage * 200, (currentPage + 1) * 200).map((code) => (
                                <InventoryBadgeItemView key={code} badgeCode={code} />
                            ))}
                        </div>
                        {pageCount > 1 && (
                            <div className="octane-handheld-inv__pages">
                                {Array.from({ length: pageCount }, (_, index) => (
                                    <BaseButton key={index} aria-current={index === currentPage ? 'page' : undefined} onClick={() => setPage(index)}>
                                        {index + 1}
                                    </BaseButton>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedBadgeCode && (
                        <HandheldInventorySelectionView
                            actions={actions}
                            meta={rarityText || (hasDescription ? description : '')}
                            name={LocalizeBadgeName(selectedBadgeCode)}
                            preview={
                                <div className="octane-handheld-inv__badge-preview">
                                    <LayoutBadgeImageView badgeCode={selectedBadgeCode} />
                                    {hasDescription && <p>{description}</p>}
                                    {ownersText && <p className="is-owners">{ownersText}</p>}
                                </div>
                            }
                            primary={{
                                key: 'wear',
                                label: isWearingBadge(selectedBadgeCode)
                                    ? localizeWithFallback('inventory.badges.clearbadge', 'Clear badge')
                                    : localizeWithFallback('inventory.badges.wearbadge', 'Wear badge'),
                                disabled: !isWearingBadge(selectedBadgeCode) && !canWearBadges(),
                                onClick: () => toggleBadge(selectedBadgeCode)
                            }}
                            thumb={<LayoutBadgeImageView badgeCode={selectedBadgeCode} />}
                        />
                    )}
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-inventory-badges">
                <div className="octane-inventory-badges-main">
                    <div
                        className={`octane-inventory-badges-owned ${isDragOverInventory && isDraggingFromActive ? 'is-drop-remove' : ''}`}
                        onDragLeave={() => {
                            setIsDragOverInventory(false);
                            setIsDraggingFromActive(false);
                        }}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setIsDraggingFromActive(event.dataTransfer.types.includes('activeslot'));
                            setIsDragOverInventory(true);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setIsDragOverInventory(false);
                            setIsDraggingFromActive(false);
                            const badgeCode = event.dataTransfer.getData('badgeCode');
                            const source = event.dataTransfer.getData('source');
                            if (source === 'active' && badgeCode) removeBadge(badgeCode);
                        }}
                    >
                        <div className="octane-inventory-badges-owned-grid" key={currentPage}>
                            {inactiveCodes.slice(currentPage * 200, (currentPage + 1) * 200).map((code) => (
                                <InventoryBadgeItemView key={code} badgeCode={code} />
                            ))}
                        </div>
                        {pageCount > 1 && (
                            <div className="octane-inventory-badges-pages">
                                {Array.from({ length: pageCount }, (_, index) => (
                                    <BaseButton key={index} type="button" className={currentPage === index ? 'is-active' : ''} onClick={() => setPage(index)}>
                                        {index}
                                    </BaseButton>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="octane-inventory-badges-wearing">
                        <div className="octane-inventory-badges-wearing-title">{localizeWithFallback('inventory.badges.activebadges', 'Wearing')}</div>
                        <div className="octane-inventory-badges-wearing-grid">
                            {Array.from({ length: maxSlots }).map((_, index) => (
                                <ActiveBadgeSlot
                                    key={index}
                                    badgeCode={activeBadgeCodes[index]}
                                    isSelected={selectedBadgeCode === activeBadgeCodes[index] && !!activeBadgeCodes[index]}
                                    slotIndex={index}
                                    onDropBadge={handleDropOnSlot}
                                    onDragStartFromSlot={handleDragStartFromSlot}
                                    onSelectBadge={setSelectedBadgeCode}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="octane-inventory-badges-footer">
                    {selectedBadgeCode ? (
                        <>
                            <div className="octane-inventory-badges-footer-image">
                                <LayoutBadgeImageView badgeCode={selectedBadgeCode} />
                            </div>
                            <div className="octane-inventory-badges-footer-details">
                                <div className="octane-inventory-badges-footer-name">{LocalizeBadgeName(selectedBadgeCode)}</div>
                                {description && description !== selectedBadgeCode && <div className="octane-inventory-badges-footer-desc">{description}</div>}
                                <div className="octane-inventory-badges-footer-meta">
                                    {rarityText && <span className={`octane-inventory-badge-rarity rarity-${rarityStat.rarity}`}>{rarityText}</span>}
                                    {rarityStat && rarityStat.ownerCount > 0 && rarityStat.ownerCount < 1000 && (
                                        <span className="octane-inventory-badge-owners">
                                            {localizeWithFallback(
                                                'badge.owner_count',
                                                `${rarityStat.ownerCount.toLocaleString()} owners`,
                                                ['count'],
                                                [rarityStat.ownerCount.toLocaleString()]
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="octane-inventory-badges-footer-actions">
                                <OctaneButton
                                    className="button-shiny octane-inventory-btn-wear"
                                    disabled={!isWearingBadge(selectedBadgeCode) && !canWearBadges()}
                                    onClick={() => toggleBadge(selectedBadgeCode)}
                                >
                                    {isWearingBadge(selectedBadgeCode)
                                        ? localizeWithFallback('inventory.badges.clearbadge', 'Clear badge')
                                        : localizeWithFallback('inventory.badges.wearbadge', 'Wear badge')}
                                </OctaneButton>
                            </div>
                        </>
                    ) : (
                        <OctaneButton className="button-shiny octane-inventory-btn-wear octane-inventory-badge-wear-empty" disabled>
                            {localizeWithFallback('inventory.badges.wearbadge', 'Wear badge')}
                        </OctaneButton>
                    )}
                </div>
                <div className="octane-inventory-badges-polaris-row">
                    {selectedBadgeCode && (
                        <>
                            {isOwnCustomBadge(selectedBadgeCode) && (
                                <OctaneButton className="octane-inventory-btn-icon" onClick={handleEditCustom}>
                                    <FaPencilAlt className="fa-icon" />
                                </OctaneButton>
                            )}
                            {!isWearingBadge(selectedBadgeCode) && (
                                <OctaneButton
                                    className="octane-inventory-btn-delete"
                                    onClick={isOwnCustomBadge(selectedBadgeCode) ? handleDeleteCustom : attemptDeleteBadge}
                                >
                                    <FaTrashAlt className="fa-icon" />
                                </OctaneButton>
                            )}
                        </>
                    )}

                    <BaseButton type="button" className={customFilter === 'all' ? 'is-active' : ''} onClick={() => setCustomFilter('all')}>
                        {localizeWithFallback('inventory.badges.tab.all', 'All')} ({baseCodes.length})
                    </BaseButton>
                    <BaseButton type="button" className={customFilter === 'custom' ? 'is-active' : ''} onClick={() => setCustomFilter('custom')}>
                        {localizeWithFallback('inventory.badges.tab.custom', 'Custom')} ({customCount})
                    </BaseButton>
                    <BaseButton type="button" className="is-create" onClick={() => CreateLinkEvent('badge-creator/show')}>
                        <FaPaintBrush className="fa-icon" /> {localizeWithFallback('inventory.badges.create', 'Create badge')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
