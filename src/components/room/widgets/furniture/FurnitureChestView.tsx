import {
    ChestCloseComposer,
    ChestDataEvent,
    ChestDepositComposer,
    ChestEnableWiredComposer,
    ChestDepositInventoryItemComposer,
    ChestFurniChunkEvent,
    ChestFurniDeltaEvent,
    ChestLogEvent,
    ChestRequestLogComposer,
    ChestSaveNotificationsComposer,
    ChestSaveOptionsComposer,
    ChestSaveSettingsComposer,
    ChestStartDepositComposer,
    ChestUpgradeCapacityComposer,
    ChestUpgradeResultEvent,
    ChestWithdrawAllFurniComposer,
    ChestWithdrawComposer,
    ChestWithdrawFurniComposer,
    FurnitureListComposer,
    FurnitureListInvalidateEvent,
    FurnitureType,
    GetSessionDataManager,
    IChestFurniStoredItem,
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, ProductImageUtility, SendMessageComposer } from '../../../../api';
import sceneHigh from '../../../../assets/images/chest/light_coins_chest_balance_high.png';
import sceneLow from '../../../../assets/images/chest/light_coins_chest_balance_low.png';
import sceneMedium from '../../../../assets/images/chest/light_coins_chest_balance_medium.png';
import sceneZero from '../../../../assets/images/chest/light_coins_chest_balance_zero.png';
import furniEmptyScene from '../../../../assets/images/chest/variant_furni_chest_empty.png';
import bellIcon from '../../../../assets/images/chest/wired_chests_bell_icon.png';
import gearIcon from '../../../../assets/images/chest/wired_chests_gear_icon.png';
import { Column, Flex, LayoutCurrencyIcon, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, usePurse } from '../../../../hooks';
import { useInventoryFurni } from '../../../../hooks/inventory';
import { ChestButton } from './ChestButton';
import { ChestFurniGroup, chestFurniDisplayName, groupStoredFurni } from './chestFurniGrouping';
import { FurniChestGridItem } from './FurniChestGridItem';
import { FurniChestSearchBar } from './FurniChestSearchBar';

interface ChestEntry {
    currencyType: number;
    amount: number;
}

interface ChestLogRow {
    type: string;
    timestamp: number;
    userName: string;
    withdrawn: number;
    deposited: number;
}

const CREDITS = -1;
const CHEST_KIND_FURNI = 1;
const UPGRADE_STEP = 5000;
const NON_DIGITS = /\D/g;
/** Matches ChestStorage.MAX_CAPACITY, the ceiling the server refuses to go past. */
const MAX_CAPACITY = 1_000_000;
/** Matches the server's per-purchase cap. */
const MAX_UPGRADES_PER_PURCHASE = 10;
const LOCK_INFO_RULES = [1, 2, 3, 4, 5, 6, 7].map((n) => `wiredchests.lock_info.rule_${ n }`);
const CAPACITY_INFO_RULES = [1, 2, 3, 4].map((n) => `wiredchests.capacity_info.rule_${ n }`);
const FURNI_SEARCH_THRESHOLD = 31;

const furniName = (baseItemId: number, wallItem = false): string => {
    const data = wallItem
        ? GetSessionDataManager().getWallItemData(baseItemId)
        : GetSessionDataManager().getFloorItemData(baseItemId);
    return data?.name || `#${baseItemId}`;
};
const COST_CREDITS = 10;
const COST_DIAMONDS = 10;

const groupLabel = (group: ChestFurniGroup): string =>
    chestFurniDisplayName(
        group,
        LocalizeText,
        (id) => furniName(id, false),
        (id) => furniName(id, true),
    );

export const FurnitureChestView: FC = () => {
    const [itemId, setItemId] = useState(-1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [capacityMax, setCapacityMax] = useState(5000);
    const [used, setUsed] = useState(0);
    const [accessOpen, setAccessOpen] = useState(true);
    const [accessDonate, setAccessDonate] = useState(false);
    const [locked, setLocked] = useState(false);
    const [autoLock, setAutoLock] = useState(false);
    const [capacity, setCapacity] = useState(0);
    const [isOwner, setIsOwner] = useState(false);
    const [appearanceState, setAppearanceState] = useState(0);
    const [notifyFull, setNotifyFull] = useState(false);
    const [notifyDonation, setNotifyDonation] = useState(false);
    const [notifyWithdraw, setNotifyWithdraw] = useState(false);
    const [notifyEmpty, setNotifyEmpty] = useState(false);
    const [notifyWired, setNotifyWired] = useState(false);
    const [notifyMode, setNotifyMode] = useState(0);
    const [entries, setEntries] = useState<ChestEntry[]>([]);
    const [chestKind, setChestKind] = useState(0);
    const [storedFurniItems, setStoredFurniItems] = useState<IChestFurniStoredItem[]>([]);
    const [legacyFurniGroups, setLegacyFurniGroups] = useState<ChestFurniGroup[]>([]);
    const [selectedFurniKey, setSelectedFurniKey] = useState('');
    const [furniWithdrawAmount, setFurniWithdrawAmount] = useState(1);

    const [withdrawAmount, setWithdrawAmount] = useState(1);
    const [depositOpen, setDepositOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState(0);

    const [showSettings, setShowSettings] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [logRows, setLogRows] = useState<ChestLogRow[]>([]);
    const [upgradeQty, setUpgradeQty] = useState(1);
    const [confirmWithdrawAll, setConfirmWithdrawAll] = useState(false);
    const [confirmLock, setConfirmLock] = useState<null | boolean>(null);
    const [showLockInfo, setShowLockInfo] = useState(false);
    const [upgradeResult, setUpgradeResult] = useState('');
    const [capacityDraft, setCapacityDraft] = useState('');
    const [chestBaseItemId, setChestBaseItemId] = useState(0);
    const [wiredEnabled, setWiredEnabled] = useState(true);
    const [isStarter, setIsStarter] = useState(false);
    const [confirmWiredUpgrade, setConfirmWiredUpgrade] = useState(false);
    const [previewMode, setPreviewMode] = useState(0);
    const [previewAmount, setPreviewAmount] = useState(1);

    const { getCurrencyAmount } = usePurse();
    const creditsWallet = getCurrencyAmount(-1);
    const diamondsWallet = getCurrencyAmount(5);
    const [furniSearchDraft, setFurniSearchDraft] = useState('');
    const [furniSearchQuery, setFurniSearchQuery] = useState('');

    const { groupItems = [] } = useInventoryFurni();

    const furniEntries = useMemo(() => {
        if (chestKind === CHEST_KIND_FURNI) return groupStoredFurni(storedFurniItems);
        return legacyFurniGroups;
    }, [chestKind, storedFurniItems, legacyFurniGroups]);

    const syncSelectedFurniKey = useCallback((groups: ChestFurniGroup[]) => {
        setSelectedFurniKey((prev) =>
            groups.some((f) => f.key === prev) ? prev : groups.length ? groups[0].key : '',
        );
    }, []);

    const appearanceOptions = useMemo(
        () => [
            { value: 0, label: LocalizeText('wiredchests.settings.appearance.state.0') },
            { value: 1, label: LocalizeText('wiredchests.settings.appearance.state.1') },
            { value: 2, label: LocalizeText('wiredchests.settings.appearance.state.2') },
        ],
        [],
    );

    const notifyModes = useMemo(
        () => [
            { value: 0, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.0') },
            { value: 1, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.1') },
            { value: 2, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.2') },
        ],
        [],
    );

    const visibleFurniEntries = useMemo(() => {
        const q = furniSearchQuery.trim().toLowerCase();
        if (!q) return furniEntries;
        const terms = q.split(/\s+/).filter(Boolean);
        return furniEntries.filter((f) => {
            const name = groupLabel(f).toLowerCase();
            return terms.every((term) => name.includes(term));
        });
    }, [furniEntries, furniSearchQuery]);

    const showFurniSearch = furniEntries.length >= FURNI_SEARCH_THRESHOLD;

    useEffect(() => {
        setFurniWithdrawAmount(1);
    }, [selectedFurniKey]);

    const selectedGroup = furniEntries.find((f) => f.key === selectedFurniKey) ?? null;


    useEffect(() => {
        syncSelectedFurniKey(furniEntries);
    }, [furniEntries, syncSelectedFurniKey]);

    // A chest set to open while someone looks inside stays open until we say we stopped, and the
    // window can go away without the close button ever being clicked -- leaving the room, reloading,
    // the widget unmounting. Saying goodbye from the cleanup covers every one of those.
    useEffect(() => {
        if (itemId <= 0) return;

        return () => {
            SendMessageComposer(new ChestCloseComposer(itemId));
        };
    }, [itemId]);

    useMessageEvent<ChestDataEvent>(ChestDataEvent, (event) => {
        const p = event.getParser();
        setItemId(p.itemId);
        setName(p.name);
        setDescription(p.description);
        setCapacityMax(p.capacityMax);
        setUsed(p.used);
        setAccessOpen(p.accessOpen);
        setAccessDonate(p.accessDonate);
        setLocked(p.locked);
        setAutoLock(p.autoLock);
        setCapacity(p.capacity || p.capacityMax);
        setCapacityDraft(String(p.capacity || p.capacityMax));
        setIsOwner(p.viewerOwnsChest);
        setChestBaseItemId(p.chestSpriteId);
        setWiredEnabled(p.wiredEnabled);
        setIsStarter(p.starterChest);
        setPreviewMode(p.previewMode);
        setPreviewAmount(p.previewAmount);
        setAppearanceState(p.appearanceState);
        setNotifyFull(p.notifyFull);
        setNotifyDonation(p.notifyDonation);
        setNotifyWithdraw(p.notifyWithdraw);
        setNotifyEmpty(p.notifyEmpty);
        setNotifyWired(p.notifyWired);
        setNotifyMode(p.notifyMode);
        setEntries(p.entries.map((e) => ({ currencyType: e.currencyType, amount: e.amount })));
        setChestKind(p.chestKind);
        if (p.chestKind === CHEST_KIND_FURNI) {
            // v2 rows: chunk/delta own storedFurniItems — only refresh shell fields here.
        } else {
            const legacyGroups: ChestFurniGroup[] = p.furniEntries.map((e) => ({
                key: `0-${e.baseItemId}-`,
                wallItem: false,
                baseItemId: e.baseItemId,
                legacyPosterId: '',
                specialType: 0,
                quantity: e.quantity,
                sample: {
                    inventoryId: 0,
                    lockState: 0,
                    transactionId: 0,
                    wallItem: false,
                    baseItemId: e.baseItemId,
                    legacyPosterId: '',
                    groupable: true,
                    specialType: 0,
                    stuffData: null,
                    extra: 0,
                },
            }));
            setLegacyFurniGroups(legacyGroups);
        }
    });

    useMessageEvent<ChestUpgradeResultEvent>(ChestUpgradeResultEvent, (event) => {
        const p = event.getParser();
        if (p.chestId !== itemId) return;

        if (p.successful) {
            setUpgradeResult('');
            setShowUpgrade(false);
            return;
        }

        // Every refusal has its own reason text; an unknown code still says something rather than
        // leaving the button looking like it was ignored.
        setUpgradeResult(
            LocalizeText(
                'wiredchests.upgrade.result.error',
                ['reason'],
                [localizeWithFallback(`wiredchests.upgrade.result.error.${ p.resultCode }`, '')],
            ),
        );
    });

    useMessageEvent<ChestFurniChunkEvent>(ChestFurniChunkEvent, (event) => {
        const p = event.getParser();
        setItemId(p.chestId);

        setStoredFurniItems((prev) => {
            const next = p.fragmentNo === 0 ? [] : [...prev];
            next.push(...p.items);
            return next;
        });
    });

    useMessageEvent<ChestFurniDeltaEvent>(ChestFurniDeltaEvent, (event) => {
        const p = event.getParser();

        setStoredFurniItems((prev) => {
            const removed = new Set(p.removedIds);
            return [...prev.filter((i) => !removed.has(i.inventoryId)), ...p.added];
        });
    });

    useMessageEvent<ChestLogEvent>(ChestLogEvent, (event) => {
        const p = event.getParser();
        setLogRows(p.rows.map((r) => ({ ...r })));
        setShowLog(true);
    });

    if (itemId === -1) return null;

    const creditsBalance = entries.find((e) => e.currencyType === CREDITS)?.amount ?? 0;
    // Scene image follows the official CoinChestSubController.CHEST_STATES thresholds:
    // absolute coin count (NOT a fill ratio) — 0 -> zero, >=1 -> low, >=20 -> medium, >=100 -> high.
    const sceneImg =
        creditsBalance >= 100 ? sceneHigh : creditsBalance >= 20 ? sceneMedium : creditsBalance >= 1 ? sceneLow : sceneZero;

    const isFurni = chestKind === CHEST_KIND_FURNI;
    const chestTypeLabel = isFurni
        ? LocalizeText('wiredchests.furni_chest')
        : LocalizeText('wiredchests.coin_chest');
    const selectedFurniQty = selectedGroup?.quantity ?? 0;

    const close = () => {
        setItemId(-1);
        setStoredFurniItems([]);
        setLegacyFurniGroups([]);
    };
    const deposit = () => {
        if (depositAmount <= 0) return;
        SendMessageComposer(new ChestDepositComposer(itemId, CREDITS, depositAmount));
        setDepositAmount(0);
    };
    const withdraw = () => {
        if (withdrawAmount <= 0) return;
        SendMessageComposer(new ChestWithdrawComposer(itemId, CREDITS, withdrawAmount));
        setWithdrawAmount(0);
    };
    const withdrawAll = () => setConfirmWithdrawAll(true);
    const doWithdrawAll = () => {
        if (isFurni) {
            SendMessageComposer(new ChestWithdrawAllFurniComposer(itemId));
        } else {
            SendMessageComposer(new ChestWithdrawComposer(itemId, CREDITS, -1));
        }
        setConfirmWithdrawAll(false);
    };
    const withdrawFurni = () => {
        if (!selectedGroup || furniWithdrawAmount <= 0 || selectedFurniQty <= 0) return;
        SendMessageComposer(
            new ChestWithdrawFurniComposer(
                itemId,
                selectedGroup.wallItem,
                selectedGroup.baseItemId,
                selectedGroup.legacyPosterId,
                furniWithdrawAmount,
            ),
        );
    };
    const depositInventoryItem = (inventoryItemId: number) => {
        if (inventoryItemId <= 0 || used >= capacity) return;
        SendMessageComposer(new ChestDepositInventoryItemComposer(itemId, inventoryItemId));
    };
    const startDepositFurni = () => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new ChestStartDepositComposer(itemId));
    };
    const requestLog = () => SendMessageComposer(new ChestRequestLogComposer(itemId));
    const saveSettings = () => {
        SendMessageComposer(
            new ChestSaveSettingsComposer(
                itemId,
                name,
                description,
                accessOpen,
                accessDonate,
                appearanceState,
                previewMode,
                previewAmount,
            ),
        );
        setShowSettings(false);
    };
    /**
     * The three switches on this window save the moment they are touched, the way the official one
     * does — no save button, because closing a chest is not a settings change you review first.
     */
    const saveOptions = (next: { locked?: boolean; autoLock?: boolean; capacity?: number }) => {
        const nextLocked = next.locked ?? locked;
        const nextAutoLock = next.autoLock ?? autoLock;
        const nextCapacity = next.capacity ?? capacity;

        setLocked(nextLocked);
        setAutoLock(nextAutoLock);
        setCapacity(nextCapacity);
        SendMessageComposer(new ChestSaveOptionsComposer(itemId, nextLocked, nextAutoLock, nextCapacity));
    };

    /**
     * A lock closes the chest to the room, not to its owner, so the owner keeps both directions and
     * everyone else loses both until it comes off.
     */
    const canWithdraw = !locked || isOwner;
    const canDeposit = !locked || isOwner;

    /**
     * Anyone in the room who can reach this window may throw the lock -- that is the point of a panic
     * button. Taking it off again is the owner's alone, so a lock cannot be undone by whoever set it.
     */
    const canToggleLock = isOwner || !locked;

    /**
     * How many steps are still buyable. The official offers 1..remaining rather than a fixed list, so
     * the dropdown can never propose a purchase the chest has no room for.
     */
    const upgradesLeft = Math.max(0, Math.floor((MAX_CAPACITY - capacityMax) / UPGRADE_STEP));
    const upgradeOptions = Array.from(
        { length: Math.min(upgradesLeft, MAX_UPGRADES_PER_PURCHASE) },
        (unused, index) => index + 1,
    );

    /** The reason the buy button is off, in the official's own order: capacity first, then money. */
    const upgradeError = !upgradesLeft
        ? 'wiredchests.upgrade.error.reason.at_capacity'
        : creditsWallet < COST_CREDITS * upgradeQty || diamondsWallet < COST_DIAMONDS * upgradeQty
          ? 'wiredchests.upgrade.error.reason.not_enough_currency'
          : '';

    const commitCapacity = () => {
        const parsed = parseInt(capacityDraft, 10);
        const next = Math.min(Math.max(isNaN(parsed) ? 1 : parsed, 1), capacityMax);

        setCapacityDraft(String(next));
        if (next !== capacity) saveOptions({ capacity: next });
    };
    const saveNotifications = () => {
        SendMessageComposer(new ChestSaveNotificationsComposer(itemId, notifyFull, notifyDonation, notifyWithdraw, notifyEmpty, notifyWired, notifyMode));
        setShowNotifications(false);
    };
    const buyUpgrade = () => {
        setUpgradeResult('');
        SendMessageComposer(new ChestUpgradeCapacityComposer(itemId, upgradeQty));
    };

    return (
        <>
            {/* ===== MAIN WINDOW ===== */}
            <OctaneCardView className="octane-widget-chest" theme="primary-slim" style={{ width: 460 }}>
                <OctaneCardHeaderView headerText={name || chestTypeLabel} onCloseClick={close} />
                <OctaneCardContentView>
                    {locked && !isOwner && (
                        <div className="mb-1 rounded border border-[#c08a5a] bg-[#f7e6cf] px-2 py-1 text-[11px] text-[#7a4a1c]">
                            {localizeWithFallback(
                                'wiredchests.locked.notice',
                                'This chest is locked. Nothing goes in or out by hand until it is unlocked.',
                            )}
                        </div>
                    )}
                    {/* ===== header box (chest_generic.xml container "header", 460x51) =====
                         grey band (layout_1 #dadada) + bottom splitter (#c0c0c0 @y50);
                         desc text @(10,10) 380w bold blend=0.6; bell btn @(397,7) + gear btn @(426,7) 24x24.
                         margin -10 bleeds past OctaneCardContentView's p-[10px] to the card edges. */}
                    <div
                        style={{
                            position: 'relative',
                            background: '#dadada',
                            borderBottom: '1px solid #c0c0c0',
                            margin: '-10px -10px 0',
                            padding: '10px',
                            minHeight: 51,
                            boxSizing: 'border-box',
                        }}
                    >
                        <Text
                            style={{
                                display: 'block',
                                maxWidth: 380,
                                paddingRight: 58,
                                fontWeight: 'bold',
                                fontSize: 12,
                                lineHeight: 1.25,
                                color: '#2e2e2e',
                                opacity: 0.6,
                            }}
                        >
                            {description || LocalizeText('wiredchests.description_placeholder')}
                        </Text>
                        <div style={{ position: 'absolute', top: 7, right: 9, display: 'flex', gap: 5 }}>
                            {/* notification_settings_button 24x24, icon wired_chests_bell_icon 12x15 */}
                            <button
                                type="button"
                                className="flex items-center justify-center cursor-pointer shrink-0"
                                style={{ width: 24, height: 24, background: '#f1f0ee', border: '1px solid #cfcabc', borderRadius: 4, padding: 0 }}
                                onClick={() => setShowNotifications(true)}
                                title={LocalizeText('wiredchests.notifications.button')}
                            >
                                <img src={bellIcon} width={12} height={15} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
                            </button>
                            {/* settings_button 24x24, icon wired_chests_gear_icon 14x14 */}
                            <button
                                type="button"
                                className="flex items-center justify-center cursor-pointer shrink-0"
                                style={{ width: 24, height: 24, background: '#f1f0ee', border: '1px solid #cfcabc', borderRadius: 4, padding: 0 }}
                                onClick={() => setShowSettings(true)}
                                title={LocalizeText('wiredchests.settings.button')}
                            >
                                <img src={gearIcon} width={14} height={14} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
                            </button>
                        </div>
                    </div>
                    {/* ===== FURNI CHEST body (furni_chest_contents.xml) ===== */}
                    {isFurni && (
                        <div className="octane-chest__furni-body">
                            <div className="octane-chest__grid-border">
                                {showFurniSearch && (
                                    <FurniChestSearchBar
                                        draft={furniSearchDraft}
                                        onDraftChange={setFurniSearchDraft}
                                        onApply={setFurniSearchQuery}
                                        onClear={() => {
                                            setFurniSearchDraft('');
                                            setFurniSearchQuery('');
                                        }}
                                    />
                                )}
                                <div
                                    className="octane-chest__grid-scroll"
                                    style={showFurniSearch ? { height: 204 } : undefined}
                                >
                                    {visibleFurniEntries.length === 0 ? (
                                        <div className="octane-chest__grid-empty">
                                            <Text small style={{ opacity: 0.5 }}>
                                                {localizeWithFallback('wiredchests.furni_chest.no_items', 'No items stored')}
                                            </Text>
                                        </div>
                                    ) : (
                                        <div className="octane-chest__grid">
                                            {visibleFurniEntries.map((f) => (
                                                <FurniChestGridItem
                                                    key={f.key}
                                                    group={f}
                                                    selected={selectedFurniKey === f.key}
                                                    title={groupLabel(f)}
                                                    onSelect={() => setSelectedFurniKey(f.key)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="octane-chest__detail-panel">
                                <div className="octane-chest__preview-box">
                                    {selectedGroup ? (
                                        <>
                                            <Text bold className="octane-chest__preview-name">
                                                {groupLabel(selectedGroup)}
                                            </Text>
                                            <div className="octane-chest__preview-image">
                                                <LayoutFurniImageView
                                                    productType={selectedGroup.wallItem ? 'i' : 's'}
                                                    productClassId={selectedGroup.baseItemId}
                                                    extraData={selectedGroup.legacyPosterId}
                                                    direction={2}
                                                    scale={1}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <img
                                            src={furniEmptyScene}
                                            alt=""
                                            draggable={false}
                                            className="octane-chest__preview-placeholder"
                                        />
                                    )}
                                </div>
                                <div className="octane-chest__withdraw-row">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="octane-chest__input octane-chest__input--furni"
                                        value={furniWithdrawAmount}
                                        onChange={(e) =>
                                            setFurniWithdrawAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))
                                        }
                                    />
                                    <ChestButton fixed disabled={!canWithdraw || !selectedGroup || selectedFurniQty <= 0} onClick={withdrawFurni}>
                                        {LocalizeText('wiredchests.withdraw')}
                                    </ChestButton>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* ===== REAL Habbo chest scene (coin chest, extracted asset) + dynamic overlays.
                         Overlay coords are taken verbatim from the official Sulake layout
                         `coins_chest_contents.xml` (moving_container = the 324x228 scene). ===== */}
                    {!isFurni && (
                        <>
                    <div style={{ position: 'relative', width: 324, height: 228, margin: '4px auto' }}>
                        <img
                            src={sceneImg}
                            width={324}
                            height={228}
                            alt=""
                            draggable={false}
                            style={{ imageRendering: 'pixelated', display: 'block' }}
                        />
                        {/* balance_cont @ (9,68): "Saldo" label = balance_txt @ (2,7), font 11, auto_size left */}
                        <div style={{ position: 'absolute', left: 11, top: 75, width: 45, color: '#5b4632', fontWeight: 'bold', fontSize: 11, lineHeight: 1, textAlign: 'left' }}>
                            {LocalizeText('wiredchests.balance')}
                        </div>
                        {/* balance_container: AS3 centers it horizontally inside balance_cont (x9..63) at runtime
                            (balanceContainerList.x = parent.width/2 - width/2). amount (bold) + coin_icon (13x15) */}
                        <div style={{ position: 'absolute', left: 9, top: 90, width: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#5b4632' }}>{creditsBalance}</span>
                            {/* coin_icon (coins_chest_contents.xml <icon style=35>) = real credits currency icon */}
                            <LayoutCurrencyIcon type={CREDITS} style={{ width: 15, height: 15 }} />
                        </div>
                        {/* withdraw_cont @ (160,18): input (27x19 @ +0,+1) + spacing 5 + withdraw_btn (73x22 @ +32,0) */}
                        <div style={{ position: 'absolute', left: 160, top: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="octane-chest__input octane-chest__input--coin"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
                            />
                            <ChestButton fixed disabled={!canWithdraw || creditsBalance <= 0} onClick={withdraw}>
                                {LocalizeText('wiredchests.withdraw')}
                            </ChestButton>
                        </div>
                    </div>
                    {depositOpen && (
                        <Flex alignItems="center" gap={1} className="mt-1">
                            <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            />
                            <ChestButton wide disabled={!canDeposit} onClick={deposit}>
                                {LocalizeText('wiredchests.deposit')}
                            </ChestButton>
                        </Flex>
                    )}
                        </>
                    )}
                    <div className="octane-chest__footer">
                        <div className="octane-chest__locking">
                            <label className="octane-chest__option">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={locked}
                                    disabled={!canToggleLock}
                                    onChange={(e) => setConfirmLock(e.target.checked)}
                                />
                                <Text small>{localizeWithFallback('wiredchests.lock_chest', 'Lock this chest')}</Text>
                            </label>
                            <label className="octane-chest__option">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={autoLock}
                                    disabled={!isOwner}
                                    onChange={(e) => saveOptions({ autoLock: e.target.checked })}
                                />
                                <Text small>{localizeWithFallback(
                                    'wiredchests.auto_lock_chest',
                                    'Lock the chest automatically when the owner leaves the room',
                                )}</Text>
                            </label>
                            <button
                                type="button"
                                className="octane-chest__info-button"
                                title={localizeWithFallback('wiredchests.lock_info.title', 'About locking')}
                                onClick={() => setShowLockInfo((v) => !v)}
                            >
                                i
                            </button>
                        </div>
                        <Flex alignItems="center" justifyContent="between" className="octane-chest__footer-capacity">
                            <Flex alignItems="center" gap={1}>
                                <Text small style={{ opacity: 0.6 }}>
                                    {localizeWithFallback('wiredchests.capacity', 'Chest capacity:')}
                                </Text>
                                <input
                                    className="form-control form-control-sm octane-chest__capacity-input"
                                    inputMode="numeric"
                                    type="text"
                                    disabled={!isOwner}
                                    value={capacityDraft}
                                    onChange={(e) => setCapacityDraft(e.target.value.replace(NON_DIGITS, ''))}
                                    onBlur={commitCapacity}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitCapacity();
                                    }}
                                />
                            </Flex>
                            <Flex alignItems="center" gap={1}>
                                <Text small style={{ opacity: 0.6 }}>
                                    {LocalizeText('wiredchests.max_capacity', ['max_capacity'], [String(capacityMax)])}
                                </Text>
                                <ChestButton
                                    icon
                                    disabled={!isOwner}
                                    onClick={() => setShowUpgrade(true)}
                                    title={
                                        isOwner
                                            ? LocalizeText('wiredchests.upgrade_capacity')
                                            : localizeWithFallback('wiredchests.upgrade.error.reason.not_owner', '')
                                    }
                                >
                                    +
                                </ChestButton>
                            </Flex>
                        </Flex>
                        <Text small style={{ opacity: 0.6 }}>
                            {LocalizeText('wiredchests.space_used2', ['count', 'total'], [String(used), String(capacity)])}
                        </Text>
                        <div className="octane-chest__footer-row">
                            {!isFurni ? (
                                <div className="octane-chest__footer-group">
                                    <ChestButton wide footer disabled={!canWithdraw || creditsBalance <= 0} onClick={withdrawAll}>
                                        {LocalizeText('wiredchests.withdraw_all')}
                                    </ChestButton>
                                    <ChestButton wide footer disabled={!canDeposit} onClick={() => setDepositOpen((v) => !v)}>
                                        {LocalizeText('wiredchests.initial_deposit')}
                                    </ChestButton>
                                </div>
                            ) : (
                                <div className="octane-chest__footer-group">
                                    <ChestButton wide footer disabled={!canWithdraw || furniEntries.length <= 0} onClick={withdrawAll}>
                                        {LocalizeText('wiredchests.withdraw_all')}
                                    </ChestButton>
                                    <ChestButton wide footer disabled={!canDeposit} onClick={startDepositFurni}>
                                        {LocalizeText('wiredchests.start_deposit')}
                                    </ChestButton>
                                </div>
                            )}
                            <ChestButton wide footer onClick={requestLog}>
                                {LocalizeText('wiredchests.view_logs')}
                            </ChestButton>
                        </div>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>

            {/* ===== SETTINGS ===== */}
            {showSettings && (
                <OctaneCardView className="octane-widget-chest-settings" theme="primary-slim" style={{ width: 360 }}>
                    <OctaneCardHeaderView
                        headerText={LocalizeText('wiredchests.settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowSettings(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text bold>{LocalizeText('wiredchests.settings.access')}</Text>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={accessOpen} onChange={(e) => setAccessOpen(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.open')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={accessDonate} onChange={(e) => setAccessDonate(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.donate')}</Text>
                            </label>
                            <Text bold>{LocalizeText('wiredchests.settings.info')}</Text>
                            <Text small>{LocalizeText('wiredchests.settings.info.name')}</Text>
                            <input className="form-control form-control-sm" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                            <Text small>{LocalizeText('wiredchests.settings.info.desc')}</Text>
                            <textarea className="form-control form-control-sm" rows={3} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
                            <Text bold>{LocalizeText('wiredchests.settings.appearance')}</Text>
                            <Text small>{LocalizeText('wiredchests.settings.appearance.state')}</Text>
                            <select className="form-select form-select-sm" value={appearanceState} onChange={(e) => setAppearanceState(parseInt(e.target.value, 10))}>
                                {appearanceOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            {isFurni && (
                                <>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={previewMode > 0}
                                            onChange={(e) => setPreviewMode(e.target.checked ? 1 : 0)}
                                        />
                                        <Text small>
                                            {localizeWithFallback(
                                                'wiredchests.settings.appearance.preview',
                                                'Show what is inside on top of the chest',
                                            )}
                                        </Text>
                                    </label>
                                    <Text small style={{ opacity: 0.6 }}>
                                        {localizeWithFallback('wiredchests.settings.appearance.preview.note', '')}
                                    </Text>
                                    {previewMode > 0 && (
                                        <Flex alignItems="center" gap={2}>
                                            <Text small>
                                                {localizeWithFallback(
                                                    'wiredchests.settings.appearance.preview_amount',
                                                    'How many',
                                                )}
                                            </Text>
                                            <select
                                                className="form-select form-select-sm"
                                                value={previewAmount}
                                                onChange={(e) => setPreviewAmount(parseInt(e.target.value, 10))}
                                            >
                                                {[1, 2, 3, 4].map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </Flex>
                                    )}
                                </>
                            )}
                            <Text bold>{localizeWithFallback('wiredchests.settings.wired', 'Wired')}</Text>
                            {wiredEnabled ? (
                                <Text small>
                                    {localizeWithFallback(
                                        'wiredchests.settings.wired.enabled',
                                        'This chest answers wired.',
                                    )}
                                </Text>
                            ) : (
                                <>
                                    <ChestButton
                                        wide
                                        disabled={!isOwner || isStarter}
                                        onClick={() => setConfirmWiredUpgrade(true)}
                                    >
                                        {localizeWithFallback('wiredchests.settings.wired.upgrade', 'Make it wired')}
                                    </ChestButton>
                                    <Text small style={{ opacity: 0.6 }}>
                                        {localizeWithFallback(
                                            isStarter
                                                ? 'wiredchests.settings.wired.starter'
                                                : 'wiredchests.settings.wired.hint',
                                            '',
                                        )}
                                    </Text>
                                </>
                            )}
                            <div className="octane-chest__actions">
                                <ChestButton wide onClick={saveSettings}>
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setShowSettings(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {/* ===== NOTIFICATIONS ===== */}
            {showNotifications && (
                <OctaneCardView className="octane-widget-chest-notifications" theme="primary-slim" style={{ width: 360 }}>
                    <OctaneCardHeaderView
                        headerText={LocalizeText('wiredchests.notification_settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowNotifications(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic')}</Text>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyFull} onChange={(e) => setNotifyFull(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyDonation} onChange={(e) => setNotifyDonation(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.1')}</Text>
                            </label>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired')}</Text>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyWithdraw} onChange={(e) => setNotifyWithdraw(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyEmpty} onChange={(e) => setNotifyEmpty(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.1')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyWired} onChange={(e) => setNotifyWired(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.2')}</Text>
                            </label>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.notification_mode.when')}</Text>
                            <select className="form-select form-select-sm" value={notifyMode} onChange={(e) => setNotifyMode(parseInt(e.target.value, 10))}>
                                {notifyModes.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <div className="octane-chest__actions">
                                <ChestButton wide onClick={saveNotifications}>
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setShowNotifications(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {/* ===== UPGRADE ===== */}
            {showUpgrade && (
                <OctaneCardView className="octane-widget-chest-upgrade" theme="primary-slim" style={{ width: 340 }}>
                    <OctaneCardHeaderView headerText={LocalizeText('wiredchests.upgrade.title')} onCloseClick={() => setShowUpgrade(false)} />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Flex alignItems="center" gap={2}>
                                <div className="octane-chest__upgrade-preview">
                                    {chestBaseItemId > 0 && <LayoutFurniImageView productType={FurnitureType.FLOOR} productClassId={chestBaseItemId} direction={2} />}
                                </div>
                                <Column gap={1}>
                                    <Text bold>
                                        {LocalizeText('wiredchests.upgrade.capacity.extra', ['purchase_capacity'], [String(UPGRADE_STEP * upgradeQty)])}
                                    </Text>
                                    <Text small>
                                        {LocalizeText('wiredchests.upgrade.capacity.current', ['current_capacity'], [String(capacityMax)])}
                                    </Text>
                                    <Text small>
                                        {LocalizeText('wiredchests.upgrade.capacity.new', ['new_capacity'], [String(capacityMax + UPGRADE_STEP * upgradeQty)])}
                                    </Text>
                                </Column>
                            </Flex>
                            <Flex alignItems="center" gap={2}>
                                <Text small>{LocalizeText('wiredchests.quantity')}</Text>
                                <select
                                    className="form-select form-select-sm"
                                    value={upgradeQty}
                                    onChange={(e) => setUpgradeQty(parseInt(e.target.value, 10))}
                                >
                                    {upgradeOptions.map((q) => (
                                        <option key={q} value={q}>
                                            {q}
                                        </option>
                                    ))}
                                </select>
                            </Flex>
                            <Flex alignItems="center" gap={1}>
                                {COST_CREDITS > 0 && (
                                    <>
                                        <LayoutCurrencyIcon type={-1} />
                                        <Text bold>{COST_CREDITS * upgradeQty}</Text>
                                    </>
                                )}
                                {COST_CREDITS > 0 && COST_DIAMONDS > 0 && <Text bold>+</Text>}
                                {COST_DIAMONDS > 0 && (
                                    <>
                                        <LayoutCurrencyIcon type={5} />
                                        <Text bold>{COST_DIAMONDS * upgradeQty}</Text>
                                    </>
                                )}
                            </Flex>
                            {upgradeError && (
                                <Text small className="octane-chest__upgrade-error">
                                    {LocalizeText('wiredchests.upgrade.error', ['reason'], [localizeWithFallback(upgradeError, '')])}
                                </Text>
                            )}
                            {upgradeResult && (
                                <Text small className="octane-chest__upgrade-error">
                                    {upgradeResult}
                                </Text>
                            )}
                            <div className="octane-chest__actions">
                                <ChestButton wide disabled={!!upgradeError} onClick={buyUpgrade}>
                                    {LocalizeText('wiredchests.upgrade.buy')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setShowUpgrade(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {/* ===== LOG ===== */}
            {showLog && (
                <OctaneCardView className="octane-widget-chest-log" theme="primary-slim" style={{ width: 520 }}>
                    <OctaneCardHeaderView headerText={LocalizeText('wiredchests.logs.title')} onCloseClick={() => setShowLog(false)} />
                    <OctaneCardContentView>
                        <Column gap={1}>
                            <Text small>{LocalizeText('wiredchests.logs.chest_id', ['id'], [String(itemId)])}</Text>
                            <Flex gap={2} className="border-b pb-1">
                                <Text bold className="w-20">
                                    {LocalizeText('wiredchests.logs.col.type')}
                                </Text>
                                <Text bold className="w-24">
                                    {LocalizeText('wiredchests.logs.col.timestamp')}
                                </Text>
                                <Text bold className="grow!">
                                    {LocalizeText('wiredchests.logs.col.username')}
                                </Text>
                                <Text bold className="w-16">
                                    {LocalizeText('wiredchests.logs.col.withdraws')}
                                </Text>
                                <Text bold className="w-16">
                                    {LocalizeText('wiredchests.logs.col.deposits')}
                                </Text>
                            </Flex>
                            {logRows.length === 0 && <Text small>{LocalizeText('wiredchests.logs.empty')}</Text>}
                            {logRows.map((r, i) => (
                                <Flex key={i} gap={2}>
                                    <Text small className="w-20">
                                        {r.type === 'withdraw'
                                            ? LocalizeText('wiredchests.logs.type.withdraw')
                                            : LocalizeText('wiredchests.logs.type.deposit')}
                                    </Text>
                                    <Text small className="w-24">
                                        {new Date(r.timestamp * 1000).toLocaleString()}
                                    </Text>
                                    <Text small className="grow!">
                                        {r.userName}
                                    </Text>
                                    <Text small className="w-16">
                                        {r.withdrawn || ''}
                                    </Text>
                                    <Text small className="w-16">
                                        {r.deposited || ''}
                                    </Text>
                                </Flex>
                            ))}
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {/* ===== WITHDRAW-ALL CONFIRM (mirrors WiredChestWrapperView.onWithdrawAllClick) ===== */}
            {confirmWiredUpgrade && (
                <OctaneCardView className="octane-widget-chest-confirm" theme="primary-slim" style={{ width: 360 }}>
                    <OctaneCardHeaderView
                        headerText={localizeWithFallback('wiredchests.upgrade.wired.title', 'Make it wired')}
                        onCloseClick={() => setConfirmWiredUpgrade(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Flex alignItems="center" gap={2}>
                                <div className="octane-chest__upgrade-preview">
                                    {chestBaseItemId > 0 && (
                                        <LayoutFurniImageView
                                            productType={FurnitureType.FLOOR}
                                            productClassId={chestBaseItemId}
                                            direction={2}
                                        />
                                    )}
                                </div>
                                <Text>
                                    {localizeWithFallback(
                                        'wiredchests.upgrade.wired.desc',
                                        'Wired will be able to fill and empty this chest. This cannot be undone.',
                                    )}
                                </Text>
                            </Flex>
                            <div className="octane-chest__actions">
                                <ChestButton
                                    wide
                                    onClick={() => {
                                        SendMessageComposer(new ChestEnableWiredComposer(itemId));
                                        setConfirmWiredUpgrade(false);
                                    }}
                                >
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setConfirmWiredUpgrade(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {confirmLock !== null && (
                <OctaneCardView className="octane-widget-chest-confirm" theme="primary-slim" style={{ width: 340 }}>
                    <OctaneCardHeaderView
                        headerText={localizeWithFallback(
                            confirmLock ? 'wiredchests.lock.confirm.title' : 'wiredchests.unlock.confirm.title',
                            '',
                        )}
                        onCloseClick={() => setConfirmLock(null)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text>
                                {localizeWithFallback(
                                    confirmLock ? 'wiredchests.lock.confirm.desc' : 'wiredchests.unlock.confirm.desc',
                                    '',
                                )}
                            </Text>
                            <div className="octane-chest__actions">
                                <ChestButton
                                    wide
                                    onClick={() => {
                                        saveOptions({ locked: confirmLock });
                                        setConfirmLock(null);
                                    }}
                                >
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setConfirmLock(null)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {showLockInfo && (
                <OctaneCardView className="octane-widget-chest-info" theme="primary-slim" style={{ width: 400 }}>
                    <OctaneCardHeaderView
                        headerText={localizeWithFallback('wiredchests.lock_info.title', 'About locking')}
                        onCloseClick={() => setShowLockInfo(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text small>{localizeWithFallback('wiredchests.lock_info.desc', '')}</Text>
                            <ul className="octane-chest__rules">
                                {LOCK_INFO_RULES.map((key) => (
                                    <li key={key}>
                                        <Text small>{localizeWithFallback(key, '')}</Text>
                                    </li>
                                ))}
                            </ul>
                            <Text bold>{localizeWithFallback('wiredchests.capacity_info.title', 'About capacity')}</Text>
                            <Text small>{localizeWithFallback('wiredchests.capacity_info.desc', '')}</Text>
                            <ul className="octane-chest__rules">
                                {CAPACITY_INFO_RULES.map((key) => (
                                    <li key={key}>
                                        <Text small>{localizeWithFallback(key, '')}</Text>
                                    </li>
                                ))}
                            </ul>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {confirmWithdrawAll && (
                <OctaneCardView className="octane-widget-chest-confirm" theme="primary-slim" style={{ width: 320 }}>
                    <OctaneCardHeaderView headerText={LocalizeText('wiredchests.withdraw_all.confirm.title')} onCloseClick={() => setConfirmWithdrawAll(false)} />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text>
                                {LocalizeText(
                                    isFurni ? 'wiredchests.withdraw_all.confirm.desc_furni' : 'wiredchests.withdraw_all.confirm.desc',
                                )}
                            </Text>
                            <div className="octane-chest__actions">
                                <ChestButton wide onClick={doWithdrawAll}>
                                    {LocalizeText('wiredchests.withdraw_all.confirm.yes')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setConfirmWithdrawAll(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </>
    );
};
