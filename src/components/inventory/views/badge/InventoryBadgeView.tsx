import { CreateLinkEvent, DeleteBadgeMessageComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaPaintBrush, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import {
    deleteCustomBadge,
    ensureCustomBadgeTexts,
    fetchCustomBadges,
    GetConfigurationValue,
    isCustomBadgeCode,
    LocalizeBadgeName,
    LocalizeText,
    refreshCustomBadgeTexts,
    SendMessageComposer,
    UnseenItemCategory
} from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useInventoryBadges, useInventoryUnseenTracker, useNotification } from '../../../../hooks';
import { InfiniteGrid, OctaneButton } from '../../../../layout';
import { InventoryBadgeItemView } from './InventoryBadgeItemView';

const ActiveBadgeSlot: FC<{
    slotIndex: number;
    badgeCode?: string;
    onDropBadge: (badgeCode: string, slotIndex: number, sourceSlot?: number) => void;
    onRemoveBadge: (badgeCode: string) => void;
    onDragStartFromSlot: (event: React.DragEvent, badgeCode: string, slotIndex: number) => void;
    onSelectBadge: (badgeCode: string) => void;
    isSelected: boolean;
}> = ({ slotIndex, badgeCode, onDropBadge, onRemoveBadge, onDragStartFromSlot, onSelectBadge, isSelected }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [justDropped, setJustDropped] = useState(false);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback(() => setIsDragOver(false), []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            setIsDragOver(false);

            const droppedBadgeCode = event.dataTransfer.getData('badgeCode');
            const sourceSlotStr = event.dataTransfer.getData('activeSlot');
            const sourceSlot = sourceSlotStr !== '' ? parseInt(sourceSlotStr) : undefined;

            if (droppedBadgeCode) {
                onDropBadge(droppedBadgeCode, slotIndex, sourceSlot);
                setJustDropped(true);
                setTimeout(() => setJustDropped(false), 300);
            }
        },
        [slotIndex, onDropBadge]
    );

    const onDragStart = useCallback(
        (event: React.DragEvent) => {
            if (!badgeCode) return;
            onDragStartFromSlot(event, badgeCode, slotIndex);
            setIsDragging(true);
        },
        [badgeCode, slotIndex, onDragStartFromSlot]
    );

    const onDragEnd = useCallback(() => setIsDragging(false), []);

    return (
        <div
            className={`flex items-center justify-center rounded-md border-2 aspect-square transition-all duration-150
                ${badgeCode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                ${isDragging ? 'opacity-30 scale-95' : ''}
                ${isDragOver ? 'border-blue-400 bg-blue-400/20 animate-pulse-glow scale-105' : ''}
                ${justDropped ? 'animate-drop-settle' : ''}
                ${isSelected && badgeCode ? 'border-card-grid-item-active bg-card-grid-item-active' : 'border-card-grid-item-border bg-card-grid-item'}
                ${!badgeCode ? 'border-dashed opacity-60' : ''}`}
            draggable={!!badgeCode}
            onDragEnd={onDragEnd}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onMouseDown={() => badgeCode && onSelectBadge(badgeCode)}
        >
            {badgeCode ? <LayoutBadgeImageView badgeCode={badgeCode} /> : <span className="text-xs text-white/30">{slotIndex + 1}</span>}
        </div>
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
    const [isDragOverInventory, setIsDragOverInventory] = useState(false);
    const [isDraggingFromActive, setIsDraggingFromActive] = useState(false);

    const maxSlots = useMemo(() => GetConfigurationValue<number>('user.badges.max.slots', 5), []);

    const [ownCustomBadgeIds, setOwnCustomBadgeIds] = useState<Set<string>>(() => new Set());
    const [filter, setFilter] = useState<'all' | 'custom'>('all');

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
    }, [refreshOwnCustomBadges]);
    useEffect(() => {
        ensureCustomBadgeTexts();
    }, []);

    const baseCodes = filteredBadgeCodes !== null ? filteredBadgeCodes : badgeCodes;
    const customCount = useMemo(() => baseCodes.filter((c) => isCustomBadgeCode(c)).length, [baseCodes]);
    const displayCodes = useMemo(() => (filter === 'custom' ? baseCodes.filter((c) => isCustomBadgeCode(c)) : baseCodes), [baseCodes, filter]);

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
                    /* error already surfaced server-side */
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
            if (sourceSlot !== undefined) {
                reorderBadges(sourceSlot, slotIndex);
            } else {
                setBadgeAtSlot(badgeCode, slotIndex);
            }
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

    const handleRemoveBadge = useCallback(
        (badgeCode: string) => {
            removeBadge(badgeCode);
        },
        [removeBadge]
    );

    // Handle drop on inventory area (remove from active)
    const onInventoryDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const fromActive = event.dataTransfer.types.includes('activeslot');
        setIsDraggingFromActive(fromActive);
        setIsDragOverInventory(true);
    }, []);

    const onInventoryDragLeave = useCallback(() => {
        setIsDragOverInventory(false);
        setIsDraggingFromActive(false);
    }, []);

    const onInventoryDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            setIsDragOverInventory(false);
            setIsDraggingFromActive(false);

            const badgeCode = event.dataTransfer.getData('badgeCode');
            const source = event.dataTransfer.getData('source');

            if (source === 'active' && badgeCode) {
                removeBadge(badgeCode);
            }
        },
        [removeBadge]
    );

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

    return (
        <div className="grid h-full grid-cols-12 gap-2">
            <div
                className={`relative flex flex-col col-span-7 gap-1 overflow-hidden rounded transition-all duration-200
                    ${isDragOverInventory && isDraggingFromActive ? 'bg-red-500/10 ring-2 ring-inset ring-red-400/30 animate-pulse-glow-red' : ''}
                    ${isDragOverInventory && !isDraggingFromActive ? 'bg-blue-400/10' : ''}`}
                onDragLeave={onInventoryDragLeave}
                onDragOver={onInventoryDragOver}
                onDrop={onInventoryDrop}
            >
                {isDragOverInventory && isDraggingFromActive && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                        <FaTrashAlt className="text-red-400/60 text-2xl mb-1" />
                        <span className="text-red-400/60 text-xs font-medium">{LocalizeText('inventory.badges.clearbadge')}</span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-xs">
                    <button
                        type="button"
                        className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-card-grid-item-active text-black font-bold' : 'bg-card-grid-item'}`}
                        onClick={() => setFilter('all')}
                    >
                        {LocalizeText('inventory.badges.tab.all') !== 'inventory.badges.tab.all' ? LocalizeText('inventory.badges.tab.all') : 'All'} (
                        {baseCodes.length})
                    </button>
                    <button
                        type="button"
                        className={`px-2 py-0.5 rounded ${filter === 'custom' ? 'bg-card-grid-item-active text-black font-bold' : 'bg-card-grid-item'}`}
                        onClick={() => setFilter('custom')}
                    >
                        {LocalizeText('inventory.badges.tab.custom') !== 'inventory.badges.tab.custom' ? LocalizeText('inventory.badges.tab.custom') : 'Custom'}{' '}
                        ({customCount})
                    </button>
                    <button
                        type="button"
                        className="ml-auto px-2 py-0.5 rounded bg-card-grid-item flex items-center gap-1"
                        onClick={() => CreateLinkEvent('badge-creator/show')}
                        title={
                            LocalizeText('inventory.badges.create') !== 'inventory.badges.create'
                                ? LocalizeText('inventory.badges.create')
                                : 'Open badge creator'
                        }
                    >
                        <FaPaintBrush className="fa-icon text-[10px]" />
                        <span>
                            {LocalizeText('inventory.badges.create') !== 'inventory.badges.create' ? LocalizeText('inventory.badges.create') : 'Create'}
                        </span>
                    </button>
                </div>
                <InfiniteGrid<string>
                    columnCount={5}
                    estimateSize={50}
                    itemRender={(item) => <InventoryBadgeItemView badgeCode={item} />}
                    items={displayCodes.filter((code) => !isWearingBadge(code))}
                />
            </div>
            <div className="flex flex-col justify-between col-span-5 overflow-auto">
                <div className="flex flex-col gap-2 overflow-hidden">
                    <span className="text-sm truncate min-h-[1.25rem] leading-5">{LocalizeText('inventory.badges.activebadges')}</span>
                    <div className="grid grid-cols-3 gap-1">
                        {Array.from({ length: maxSlots }).map((_, index) => (
                            <ActiveBadgeSlot
                                key={index}
                                badgeCode={activeBadgeCodes[index]}
                                isSelected={selectedBadgeCode === activeBadgeCodes[index] && !!activeBadgeCodes[index]}
                                slotIndex={index}
                                onDropBadge={handleDropOnSlot}
                                onDragStartFromSlot={handleDragStartFromSlot}
                                onRemoveBadge={handleRemoveBadge}
                                onSelectBadge={setSelectedBadgeCode}
                            />
                        ))}
                    </div>
                </div>
                {!!selectedBadgeCode && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <LayoutBadgeImageView shrink badgeCode={selectedBadgeCode} />
                            <span className="text-sm truncate grow">{LocalizeBadgeName(selectedBadgeCode)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <OctaneButton
                                className="grow"
                                disabled={!isWearingBadge(selectedBadgeCode) && !canWearBadges()}
                                onClick={(event) => toggleBadge(selectedBadgeCode)}
                            >
                                {LocalizeText(isWearingBadge(selectedBadgeCode) ? 'inventory.badges.clearbadge' : 'inventory.badges.wearbadge')}
                            </OctaneButton>
                            {isOwnCustomBadge(selectedBadgeCode) && (
                                <OctaneButton
                                    className="p-1"
                                    title={LocalizeText('inventory.badges.edit') !== 'inventory.badges.edit' ? LocalizeText('inventory.badges.edit') : 'Edit'}
                                    onClick={handleEditCustom}
                                >
                                    <FaPencilAlt className="fa-icon" />
                                </OctaneButton>
                            )}
                            {!isWearingBadge(selectedBadgeCode) && (
                                <OctaneButton
                                    className="bg-danger! hover:bg-danger/80! p-1"
                                    onClick={isOwnCustomBadge(selectedBadgeCode) ? handleDeleteCustom : attemptDeleteBadge}
                                >
                                    <FaTrashAlt className="fa-icon" />
                                </OctaneButton>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
