import {
    ChestCloseComposer,
    ChestCoinsEvent,
    ChestFurniChunkEvent,
    ChestFurniDeltaEvent,
    ChestLogEvent,
    ChestOpenComposer,
    ChestOpenEvent,
    ChestRequestLogComposer,
    ChestSaveNotificationsComposer,
    ChestSaveOptionsComposer,
    ChestSaveSettingsComposer,
    ChestSettingsUpdatedEvent,
    ChestStartDepositComposer,
    ChestUpgradeCapacityComposer,
    ChestUpgradeResultEvent,
    ChestWithdrawAllComposer,
    ChestWithdrawCoinsComposer,
    ChestWithdrawFurniComposer,
    FurnitureDataEvent,
    FurnitureFloorUpdateEvent,
    FurnitureListComposer,
    FurnitureType,
    GetRoomEngine,
    GetSessionDataManager,
    IChestFurniStoredItem,
    RoomObjectCategory,
    RoomObjectVariable,
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    GetConfigurationValue,
    GetRoomSession,
    getWiredChestLayout,
    getWiredChestMaxCapacity,
    getWiredChestOptions,
    getWiredChestRights,
    isStarterChest,
    LocalizeText,
    localizeWithFallback,
    readWiredChestStuffData,
    SanitizeHtml,
    SendMessageComposer,
    WIRED_CHEST_KIND_COINS,
    WIRED_CHEST_KIND_FURNI,
    WiredChestKind,
} from '../../../../api';
import sceneHigh from '../../../../assets/images/chest/light_coins_chest_balance_high.png';
import sceneLow from '../../../../assets/images/chest/light_coins_chest_balance_low.png';
import sceneMedium from '../../../../assets/images/chest/light_coins_chest_balance_medium.png';
import sceneZero from '../../../../assets/images/chest/light_coins_chest_balance_zero.png';
import furniEmptyScene from '../../../../assets/images/chest/variant_furni_chest_empty.png';
import bellIcon from '../../../../assets/images/chest/wired_chests_bell_icon.png';
import gearIcon from '../../../../assets/images/chest/wired_chests_gear_icon.png';
import checkmarkIcon from '../../../../assets/images/reward-track/check.png';
import wiredIcon from '../../../../assets/images/wiredtools/wired_menu.png';
import { Column, Flex, LayoutCurrencyIcon, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, PIXEL_ART_RENDERING, Text } from '../../../../common';
import { useMessageEvent, usePurse } from '../../../../hooks';
import { useWiredToolsState } from '../../../../hooks/wired-tools/useWiredToolsState';
import { ChestButton } from './ChestButton';
import { ChestAppearanceFields, ChestSelect, ChestSettingsSection } from './ChestSettingsFields';
import { ChestFurniGroup, chestFurniDisplayName, groupStoredFurni } from './chestFurniGrouping';
import { FurniChestGridItem } from './FurniChestGridItem';
import { FurniChestSearchBar } from './FurniChestSearchBar';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';

interface ChestLogRow {
    type: string;
    timestamp: number;
    userName: string;
    withdrawn: number;
    deposited: number;
}

const CREDITS = -1;
const NON_DIGITS = /\D/g;
/** Matches the server's per-purchase cap. */
const MAX_UPGRADES_PER_PURCHASE = 10;
/** Coin chests stop at 100000 capacity and furni chests at 10000. */
const COIN_MAX_CAPACITY = 100_000;
const FURNI_MAX_CAPACITY = 10_000;
const LOCK_INFO_RULES = [1, 2, 3, 4, 5, 6, 7].map((n) => `wiredchests.lock_info.rule_${ n }`);
const CAPACITY_INFO_RULES = [1, 2, 3, 4].map((n) => `wiredchests.capacity_info.rule_${ n }`);
const FURNI_SEARCH_THRESHOLD = 31;
const COST_CREDITS = 10;
const COST_DIAMONDS = 10;

const furniName = (baseItemId: number, wallItem = false): string => {
    const data = wallItem
        ? GetSessionDataManager().getWallItemData(baseItemId)
        : GetSessionDataManager().getFloorItemData(baseItemId);
    return data?.name || `#${baseItemId}`;
};

const groupLabel = (group: ChestFurniGroup): string =>
    chestFurniDisplayName(
        group,
        LocalizeText,
        (id) => furniName(id, false),
        (id) => furniName(id, true),
    );

const configNumber = (key: string): number | null => {
    const value = GetConfigurationValue<number>(key, null);

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** The chest furni as the room engine holds it: stuff data map, owner and furni type. */
const readChestObject = (chestId: number) => {
    const roomId = GetRoomSession()?.roomId ?? -1;
    const roomObject = chestId > 0 && roomId >= 0 ? GetRoomEngine().getRoomObject(roomId, chestId, RoomObjectCategory.FLOOR) : null;
    const model = roomObject?.model ?? null;
    const typeId = model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0;

    return {
        data: readWiredChestStuffData(model?.getValue<Record<string, string>>(RoomObjectVariable.FURNITURE_DATA)),
        ownerId: model?.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID) ?? -1,
        typeId,
        className: (typeId > 0 && GetSessionDataManager().getFloorItemData(typeId)?.className) || '',
    };
};

/**
 * The wired chest window, after AIR WiredChestController / WiredChestWrapperView (WIN63-202610131318-860371703).
 *
 * <p>Opening: the server answers a furni use with ChestOpen (3966); the client asks for the contents with ChestOpen
 * (1595) and the answer decides the chest kind: ChestCoins (988) for a coin chest, ChestFurniChunk (44) fragments for a
 * furni chest. Everything else (name, access, lock, capacity, notifications, wired) is read from the chest's stuff
 * data and re-read whenever the room object updates; rights are computed on the client.
 */
export const FurnitureChestView: FC = () => {
    const [itemId, setItemId] = useState(-1);
    const [kind, setKind] = useState<WiredChestKind>(WIRED_CHEST_KIND_COINS);
    const [coins, setCoins] = useState(0);
    const [storedFurniItems, setStoredFurniItems] = useState<IChestFurniStoredItem[]>([]);
    const [selectedFurniKey, setSelectedFurniKey] = useState('');
    const [furniWithdrawAmount, setFurniWithdrawAmount] = useState(1);
    const [withdrawAmount, setWithdrawAmount] = useState(1);
    /** Bumped to re-read the chest's room object after it updates (AIR viewingChestUpdated). */
    const [, setObjectVersion] = useState(0);

    // Settings frame draft (AIR ChestSettingsUI reads the stuff data when it is shown).
    const [showSettings, setShowSettings] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [accessOpen, setAccessOpen] = useState(false);
    const [accessDonate, setAccessDonate] = useState(false);
    const [appearanceState, setAppearanceState] = useState(0);
    const [previewMode, setPreviewMode] = useState(0);
    const [previewAmount, setPreviewAmount] = useState(1);
    /** AIR: the upgrade button is disabled once the chest is wired; every save sends wiredEnabled = that. */
    const [wiredUpgradeDisabled, setWiredUpgradeDisabled] = useState(false);
    const [confirmWiredUpgrade, setConfirmWiredUpgrade] = useState(false);
    const [wiredUpgradeBuying, setWiredUpgradeBuying] = useState(false);

    // Notification settings frame draft (AIR ChestNotificationSettingsUI).
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifyFull, setNotifyFull] = useState(false);
    const [notifyDonation, setNotifyDonation] = useState(false);
    const [notifyWithdraw, setNotifyWithdraw] = useState(false);
    const [notifyEmpty, setNotifyEmpty] = useState(false);
    const [notifyWired, setNotifyWired] = useState(false);
    const [notifyMode, setNotifyMode] = useState(0);

    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [logRows, setLogRows] = useState<ChestLogRow[]>([]);
    const [upgradeQty, setUpgradeQty] = useState(1);
    const [confirmWithdrawAll, setConfirmWithdrawAll] = useState(false);
    const [confirmLock, setConfirmLock] = useState<null | boolean>(null);
    const [showLockInfo, setShowLockInfo] = useState(false);
    const [upgradeResult, setUpgradeResult] = useState('');
    /** null shows the saved capacity; a string is what the owner is typing. */
    const [capacityDraft, setCapacityDraft] = useState<string | null>(null);
    const [furniSearchDraft, setFurniSearchDraft] = useState('');
    const [furniSearchQuery, setFurniSearchQuery] = useState('');

    /** The chest a ChestOpen (1595) was sent for; only its 988 / 44 answers open the window. */
    const openingIdRef = useRef(-1);

    const { getCurrencyAmount } = usePurse();
    const creditsWallet = getCurrencyAmount(-1);
    const diamondsWallet = getCurrencyAmount(5);
    const { roomSettings } = useWiredToolsState();

    const chestObject = readChestObject(itemId);
    const stuff = chestObject.data;
    const isFurni = kind === WIRED_CHEST_KIND_FURNI;
    const isStarter = isStarterChest(chestObject.className);
    const capacityMax = getWiredChestMaxCapacity(kind, isStarter, stuff.capacityLevel, configNumber);
    const capacity = stuff.capacity > 0 ? Math.min(stuff.capacity, capacityMax) : capacityMax;
    const used = isFurni ? storedFurniItems.length : coins;
    const isOwner = chestObject.ownerId > 0 && chestObject.ownerId === GetSessionDataManager().userId;
    const rights = getWiredChestRights({
        owner: isOwner,
        roomOwner: !!GetRoomSession()?.isRoomOwner,
        hasWiredRead: !!roomSettings?.canInspect,
        hasWiredWrite: !!roomSettings?.canModify,
        empty: used <= 0,
        data: stuff,
    });
    const layout = getWiredChestLayout(rights.canRead, stuff.wiredEnabled, kind);

    const furniEntries = useMemo(() => (isFurni ? groupStoredFurni(storedFurniItems) : []), [isFurni, storedFurniItems]);

    const syncSelectedFurniKey = useCallback((groups: ChestFurniGroup[]) => {
        setSelectedFurniKey((prev) =>
            groups.some((f) => f.key === prev) ? prev : groups.length ? groups[0].key : '',
        );
    }, []);

    const notifyModes = useMemo(
        () => [
            { value: 0, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.0') },
            { value: 1, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.1') },
        ],
        [],
    );

    const visibleFurniEntries = useMemo(() => {
        const q = furniSearchQuery.trim().toLowerCase();
        if (!q) return furniEntries;
        const terms = q.split(/\s+/).filter(Boolean);
        return furniEntries.filter((f) => {
            const label = groupLabel(f).toLowerCase();
            return terms.every((term) => label.includes(term));
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

    const closeFrames = () => {
        setShowSettings(false);
        setShowNotifications(false);
        setConfirmWiredUpgrade(false);
        setShowUpgrade(false);
        setConfirmWithdrawAll(false);
        setConfirmLock(null);
    };

    // AIR WiredChestController.onOpenChest -> open(): ask for the contents.
    useMessageEvent<ChestOpenEvent>(ChestOpenEvent, (event) => {
        const chestId = event.getParser().chestId;

        if (chestId <= 0) return;

        openingIdRef.current = chestId;
        SendMessageComposer(new ChestOpenComposer(chestId));
    });

    const openChest = (chestId: number, chestKind: WiredChestKind) => {
        openingIdRef.current = -1;

        if (chestId !== itemId) {
            closeFrames();
            setFurniSearchDraft('');
            setFurniSearchQuery('');
        }

        setKind(chestKind);
        setItemId(chestId);
        setObjectVersion((value) => value + 1);
    };

    useMessageEvent<ChestCoinsEvent>(ChestCoinsEvent, (event) => {
        const p = event.getParser();

        if (p.isUpdate) {
            if (p.chestId === itemId && kind === WIRED_CHEST_KIND_COINS) setCoins(p.coins);
            return;
        }

        if (p.chestId !== openingIdRef.current) return;

        setCoins(p.coins);
        setStoredFurniItems([]);
        openChest(p.chestId, WIRED_CHEST_KIND_COINS);
    });

    const pendingFurniRef = useRef<IChestFurniStoredItem[]>([]);

    useMessageEvent<ChestFurniChunkEvent>(ChestFurniChunkEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== openingIdRef.current) return;

        if (p.fragmentNo === 0) pendingFurniRef.current = [];

        pendingFurniRef.current = [...pendingFurniRef.current, ...p.items];

        if (p.fragmentNo < p.totalFragments - 1) return;

        setStoredFurniItems(pendingFurniRef.current);
        pendingFurniRef.current = [];
        setCoins(0);
        openChest(p.chestId, WIRED_CHEST_KIND_FURNI);
    });

    useMessageEvent<ChestFurniDeltaEvent>(ChestFurniDeltaEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== itemId) return;

        setStoredFurniItems((prev) => {
            const removed = new Set(p.removedIds);
            return [...prev.filter((i) => !removed.has(i.inventoryId)), ...p.added];
        });
    });

    // AIR viewingChestUpdated: the window follows the chest's room object. The engine applies the update when it
    // handles the same message, so the read happens right after.
    const refreshObject = (objectId: number) => {
        if (objectId !== itemId) return;

        window.setTimeout(() => setObjectVersion((value) => value + 1), 0);
    };

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, (event) => refreshObject(event.getParser().item?.itemId));
    useMessageEvent<FurnitureDataEvent>(FurnitureDataEvent, (event) => refreshObject(event.getParser().furnitureId));

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

    useMessageEvent<ChestLogEvent>(ChestLogEvent, (event) => {
        const p = event.getParser();
        setLogRows(p.rows.map((r) => ({ ...r })));
        setShowLog(true);
    });

    // ChestSettingsUpdated (2159) arrives only for a successful save and closes the matching frame; a refused save
    // leaves the frame open.
    useMessageEvent<ChestSettingsUpdatedEvent>(ChestSettingsUpdatedEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== itemId) return;

        if (p.isNotificationPreferences) {
            setShowNotifications(false);
            return;
        }

        setShowSettings(false);
        setConfirmWiredUpgrade(false);
        setWiredUpgradeBuying(false);
    });

    if (itemId === -1) return null;

    // Scene image follows the official CoinChestSubController.CHEST_STATES thresholds:
    // absolute coin count (NOT a fill ratio) — 0 -> zero, >=1 -> low, >=20 -> medium, >=100 -> high.
    const sceneImg = coins >= 100 ? sceneHigh : coins >= 20 ? sceneMedium : coins >= 1 ? sceneLow : sceneZero;

    const chestTypeLabel = isFurni
        ? LocalizeText('wiredchests.furni_chest')
        : LocalizeText('wiredchests.coin_chest');
    const chestName = stuff.name || chestTypeLabel;
    const selectedFurniQty = selectedGroup?.quantity ?? 0;

    const close = () => {
        closeFrames();
        openingIdRef.current = -1;
        setItemId(-1);
        setStoredFurniItems([]);
        setCoins(0);
    };
    const openSettings = () => {
        setName(stuff.name);
        setDescription(stuff.description);
        setAccessOpen(stuff.everyoneCanOpen);
        setAccessDonate(stuff.everyoneCanDonate);
        setAppearanceState(stuff.stateMode);
        setPreviewMode(stuff.previewMode);
        setPreviewAmount(stuff.previewAmount);
        setWiredUpgradeDisabled(stuff.wiredEnabled);
        setWiredUpgradeBuying(false);
        setShowSettings(true);
    };
    const openNotifications = () => {
        setNotifyFull(stuff.notifyChestFull);
        setNotifyDonation(stuff.notifyDonation);
        setNotifyWithdraw(stuff.notifySomeoneWithdraws);
        setNotifyEmpty(stuff.notifyChestEmpty);
        setNotifyWired(stuff.notifyWiredTransaction);
        setNotifyMode(stuff.notifyMode);
        setShowNotifications(true);
    };
    const withdraw = () => {
        if (withdrawAmount <= 0) return;
        SendMessageComposer(new ChestWithdrawCoinsComposer(itemId, withdrawAmount));
    };
    const withdrawAll = () => setConfirmWithdrawAll(true);
    const doWithdrawAll = () => {
        SendMessageComposer(new ChestWithdrawAllComposer(itemId));
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
    /** AIR deposits furni and credit furni through the wired trade the server opens for 3268. */
    const startDeposit = () => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new ChestStartDepositComposer(itemId));
    };
    const sendSettings = (wiredEnabled: boolean) => {
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
                wiredEnabled,
            ),
        );
    };
    const saveSettings = () => sendSettings(wiredUpgradeDisabled);
    /** AIR ChestSettingsUI.confirmUpgrade: disable the button, show the checkmark, then the normal save with wired on. */
    const buyWiredUpgrade = () => {
        setWiredUpgradeBuying(true);
        setWiredUpgradeDisabled(true);
        sendSettings(true);
    };
    /**
     * The three switches on this window save the moment they are touched, the way the official one
     * does — no save button, because closing a chest is not a settings change you review first.
     */
    const saveOptions = (next: { locked?: boolean; autoLock?: boolean; capacity?: number }) => {
        const options = getWiredChestOptions(stuff, next);

        SendMessageComposer(new ChestSaveOptionsComposer(itemId, options.locked, options.autoLock, options.capacity));
    };

    /**
     * How many steps are still buyable. The official offers 1..remaining rather than a fixed list, so
     * the dropdown can never propose a purchase the chest has no room for.
     */
    const upgradeStep = getWiredChestMaxCapacity(kind, false, 1, configNumber) - getWiredChestMaxCapacity(kind, false, 0, configNumber);
    const upgradesLeft = isStarter || upgradeStep <= 0 ? 0 : Math.max(0, Math.floor(((isFurni ? FURNI_MAX_CAPACITY : COIN_MAX_CAPACITY) - capacityMax) / upgradeStep));
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
        const parsed = parseInt(capacityDraft ?? '', 10);
        const next = Math.min(Math.max(isNaN(parsed) ? capacity : parsed, 0), capacityMax);

        setCapacityDraft(null);
        if (next !== capacity) saveOptions({ capacity: next });
    };
    const saveNotifications = () => {
        SendMessageComposer(new ChestSaveNotificationsComposer(itemId, notifyMode, notifyFull, notifyDonation, notifyWithdraw, notifyEmpty, notifyWired));
    };
    const buyUpgrade = () => {
        setUpgradeResult('');
        SendMessageComposer(new ChestUpgradeCapacityComposer(itemId, upgradeQty));
    };

    return (
        <>
            {/* ===== MAIN WINDOW ===== */}
            <OctaneCardView className="octane-widget-chest" theme="primary-slim" style={{ width: 460 }}>
                <OctaneCardHeaderView headerText={chestName} onCloseClick={close} />
                <OctaneCardContentView>
                    {stuff.locked && !isOwner && (
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
                            {stuff.description || LocalizeText('wiredchests.description_placeholder')}
                        </Text>
                        <div style={{ position: 'absolute', top: 7, right: 9, display: 'flex', gap: 5 }}>
                            {/* notification_settings_button 24x24, icon wired_chests_bell_icon 12x15; owner only (AIR var_774) */}
                            {layout.showNotificationSettings && <Hint content={LocalizeText('wiredchests.notifications.button')}><BaseButton aria-label={LocalizeText('wiredchests.notifications.button')}
                                type="button"
                                className="flex items-center justify-center cursor-pointer shrink-0"
                                style={{ width: 24, height: 24, background: '#f1f0ee', border: '1px solid #cfcabc', borderRadius: 4, padding: 0 }}
                                disabled={!isOwner}
                                onClick={openNotifications}
                               
                            >
                                <img src={bellIcon} width={12} height={15} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                            </BaseButton></Hint>}
                            {/* settings_button 24x24, icon wired_chests_gear_icon 14x14; owner only */}
                            {layout.showSettings && <Hint content={LocalizeText('wiredchests.settings.button')}><BaseButton aria-label={LocalizeText('wiredchests.settings.button')}
                                type="button"
                                className="flex items-center justify-center cursor-pointer shrink-0"
                                style={{ width: 24, height: 24, background: '#f1f0ee', border: '1px solid #cfcabc', borderRadius: 4, padding: 0 }}
                                disabled={!isOwner}
                                onClick={openSettings}
                               
                            >
                                <img src={gearIcon} width={14} height={14} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                            </BaseButton></Hint>}
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
                                    <ChestButton fixed disabled={!rights.canWithdraw || !selectedGroup || selectedFurniQty <= 0} onClick={withdrawFurni}>
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
                            style={{ imageRendering: PIXEL_ART_RENDERING, display: 'block' }}
                        />
                        {/* balance_cont @ (9,68): "Saldo" label = balance_txt @ (2,7), font 11, auto_size left */}
                        <div style={{ position: 'absolute', left: 11, top: 75, width: 45, color: '#5b4632', fontWeight: 'bold', fontSize: 11, lineHeight: 1, textAlign: 'left' }}>
                            {LocalizeText('wiredchests.balance')}
                        </div>
                        {/* balance_container: AS3 centers it horizontally inside balance_cont (x9..63) at runtime
                            (balanceContainerList.x = parent.width/2 - width/2). amount (bold) + coin_icon (13x15) */}
                        <div style={{ position: 'absolute', left: 9, top: 90, width: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#5b4632' }}>{coins}</span>
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
                            <ChestButton fixed disabled={!rights.canWithdraw} onClick={withdraw}>
                                {LocalizeText('wiredchests.withdraw')}
                            </ChestButton>
                        </div>
                    </div>
                        </>
                    )}
                    <div className="octane-chest__footer">
                        {layout.showLockingOptions && <div className="octane-chest__locking">
                            <label className="octane-chest__option">
                                <Checkbox checked={stuff.locked} disabled={!rights.canToggleLock} onCheckedChange={(nextChecked) => setConfirmLock(nextChecked)} />
                                <Text small>{localizeWithFallback('wiredchests.lock_chest', 'Lock this chest')}</Text>
                            </label>
                            <label className="octane-chest__option">
                                <Checkbox checked={stuff.autoLock} disabled={!isOwner} onCheckedChange={(nextChecked) => saveOptions({ autoLock: nextChecked })} />
                                <Text small>{localizeWithFallback(
                                    'wiredchests.auto_lock_chest',
                                    'Lock the chest automatically when the owner leaves the room',
                                )}</Text>
                            </label>
                            <Hint content={localizeWithFallback('wiredchests.lock_info.title', 'About locking')}><BaseButton aria-label={localizeWithFallback('wiredchests.lock_info.title', 'About locking')}
                                type="button"
                                className="octane-chest__info-button"
                               
                                onClick={() => setShowLockInfo((v) => !v)}
                            >
                                i
                            </BaseButton></Hint>
                        </div>}
                        {layout.showCapacityOptions && <>
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
                                    value={capacityDraft ?? String(capacity)}
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
                        </>}
                        <div className="octane-chest__footer-row">
                            <div className="octane-chest__footer-group">
                                {layout.showWithdrawAll && (
                                    <ChestButton wide footer disabled={!rights.canWithdraw} onClick={withdrawAll}>
                                        {LocalizeText('wiredchests.withdraw_all')}
                                    </ChestButton>
                                )}
                                <ChestButton wide footer disabled={!rights.canDeposit} onClick={startDeposit}>
                                    {LocalizeText(layout.depositKey)}
                                </ChestButton>
                            </div>
                            {/* AIR view_logs_btn: shown and enabled for whoever may read the chest. */}
                            {layout.showLogs && (
                                <ChestButton wide footer disabled={!rights.canRead} onClick={() => SendMessageComposer(new ChestRequestLogComposer(itemId))}>
                                    {LocalizeText('wiredchests.view_logs')}
                                </ChestButton>
                            )}
                        </div>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>

            {/* ===== SETTINGS ===== */}
            {showSettings && (
                <OctaneCardView className="octane-widget-chest-settings octane-chest-settings" theme="primary-slim" frameStyle={3} isResizable={false} style={{ width: 300 }}>
                    <OctaneCardHeaderView
                        headerText={LocalizeText('wiredchests.settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowSettings(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.access')}>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={accessOpen} onCheckedChange={(nextChecked) => setAccessOpen(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.open')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={accessDonate} onCheckedChange={(nextChecked) => setAccessDonate(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.donate')}</Text>
                            </label>
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.info')}>
                            <Text small>{LocalizeText('wiredchests.settings.info.name')}</Text>
                            <input className="form-control form-control-sm" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
                            <Text small>{LocalizeText('wiredchests.settings.info.desc')}</Text>
                            <textarea className="form-control form-control-sm" rows={4} maxLength={200} style={{ height: 64 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.appearance')}>
                                <ChestAppearanceFields isFurni={isFurni} state={appearanceState} previewMode={previewMode} previewAmount={previewAmount}
                                    onStateChange={setAppearanceState} onPreviewModeChange={setPreviewMode} onPreviewAmountChange={setPreviewAmount} />
                            </ChestSettingsSection>
                            <ChestSettingsSection title={localizeWithFallback('wiredchests.settings.wired', 'Wired transactions')}>
                                <Flex alignItems="center" gap={2}>
                                    <ChestButton wide disabled={wiredUpgradeDisabled} onClick={() => setConfirmWiredUpgrade(true)}>
                                        <span className="inline-flex items-center gap-1">
                                            <img src={wiredIcon} width={16} height={16} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                                            {localizeWithFallback('wiredchests.settings.wired.upgrade', 'Upgrade to Wired Chest')}
                                        </span>
                                    </ChestButton>
                                    {wiredUpgradeDisabled && (
                                        <img src={checkmarkIcon} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                                    )}
                                </Flex>
                            </ChestSettingsSection>
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
                <OctaneCardView className="octane-widget-chest-notifications octane-chest-settings" theme="primary-slim" frameStyle={3} isResizable={false} style={{ width: 350 }}>
                    <OctaneCardHeaderView
                        headerText={LocalizeText('wiredchests.notification_settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowNotifications(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.notification_info')}</Text>
                            <Text small>{LocalizeText('wiredchests.notification_settings.notification_info.desc')}</Text>
                            <ChestSettingsSection title={LocalizeText('wiredchests.notification_settings.enable_notifications')}>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic')}</Text>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={notifyFull} onCheckedChange={(nextChecked) => setNotifyFull(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={notifyDonation} onCheckedChange={(nextChecked) => setNotifyDonation(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.1')}</Text>
                            </label>
                            <fieldset disabled={!stuff.wiredEnabled} className="octane-chest-settings__wired-notifications">
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired')}</Text>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={notifyWithdraw} onCheckedChange={(nextChecked) => setNotifyWithdraw(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={notifyEmpty} onCheckedChange={(nextChecked) => setNotifyEmpty(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.1')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={notifyWired} onCheckedChange={(nextChecked) => setNotifyWired(nextChecked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.2')}</Text>
                            </label>
                            </fieldset>
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.notification_settings.notification_mode')}>
                                <Text bold>{LocalizeText('wiredchests.notification_settings.notification_mode.when')}</Text>
                                <ChestSelect<number> label={LocalizeText('wiredchests.notification_settings.notification_mode.when')} value={notifyMode} options={notifyModes} onSelect={setNotifyMode} />
                            </ChestSettingsSection>
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
                                    {chestObject.typeId > 0 && <LayoutFurniImageView productType={FurnitureType.FLOOR} productClassId={chestObject.typeId} direction={2} />}
                                </div>
                                <Column gap={1}>
                                    <Text bold>
                                        {LocalizeText('wiredchests.upgrade.capacity.extra', ['purchase_capacity'], [String(upgradeStep * upgradeQty)])}
                                    </Text>
                                    <Text small>
                                        {LocalizeText('wiredchests.upgrade.capacity.current', ['current_capacity'], [String(capacityMax)])}
                                    </Text>
                                    <Text small>
                                        {LocalizeText('wiredchests.upgrade.capacity.new', ['new_capacity'], [String(capacityMax + upgradeStep * upgradeQty)])}
                                    </Text>
                                </Column>
                            </Flex>
                            <Flex alignItems="center" gap={2}>
                                <Text small>{LocalizeText('wiredchests.quantity')}</Text>
                                <Select
                                    className="form-select form-select-sm"
                                    value={upgradeQty}
                                    onChange={(e) => setUpgradeQty(parseInt(e.target.value, 10))}
                                >
                                    {upgradeOptions.map((q) => (
                                        <option key={q} value={q}>
                                            {q}
                                        </option>
                                    ))}
                                </Select>
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

            {/* ===== WIRED UPGRADE CONFIRM (AIR WiredChestWiredUpdateConfirmationView) ===== */}
            {confirmWiredUpgrade && showSettings && (
                <OctaneCardView className="octane-widget-chest-confirm" theme="primary-slim" style={{ width: 360 }}>
                    <OctaneCardHeaderView
                        headerText={localizeWithFallback('wiredchests.upgrade.title', 'Chest upgrade')}
                        onCloseClick={() => setConfirmWiredUpgrade(false)}
                    />
                    <OctaneCardContentView>
                        <Column gap={2}>
                            <Flex alignItems="center" gap={2}>
                                <div className="octane-chest__upgrade-preview">
                                    {chestObject.typeId > 0 && (
                                        <LayoutFurniImageView
                                            productType={FurnitureType.FLOOR}
                                            productClassId={chestObject.typeId}
                                            direction={2}
                                        />
                                    )}
                                </div>
                                <Column gap={1}>
                                    <Text bold>{LocalizeText('wiredchests.upgrade.wired.info')}</Text>
                                    <Text small dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('wiredchests.big_fat_warning')) }} />
                                </Column>
                            </Flex>
                            <Text bold>{LocalizeText('wiredchests.upgrade.wired.cost')}</Text>
                            {isStarter && (
                                <Text small className="octane-chest__upgrade-error">
                                    {LocalizeText(
                                        'wiredchests.upgrade.wired.error',
                                        ['reason'],
                                        [LocalizeText('wiredchests.upgrade.wired.error.reason.rookie_chest')],
                                    )}
                                </Text>
                            )}
                            <div className="octane-chest__actions">
                                <ChestButton wide onClick={() => setConfirmWiredUpgrade(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                                <ChestButton wide disabled={isStarter || wiredUpgradeBuying} onClick={buyWiredUpgrade}>
                                    {LocalizeText('wiredchests.upgrade.buy')}
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
