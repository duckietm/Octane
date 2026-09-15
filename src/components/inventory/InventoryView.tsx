import {
    AddLinkEventTracker,
    BadgePointLimitsEvent,
    GetLocalizationManager,
    GetRoomEngine,
    ILinkEventTracker,
    IRoomSession,
    RemoveLinkEventTracker,
    RoomEngineObjectEvent,
    RoomEngineObjectPlacedEvent,
    RoomPreviewer,
    RoomSessionEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { ensureBadgeLeaderboardLoaded, GetConfigurationValue, isObjectMoverRequested, LocalizeText, setObjectMoverRequested, UnseenItemCategory } from '../../api';
import { OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import {
    useInventoryBadges,
    useInventoryFurni,
    useInventoryPrefixes,
    useInventoryTrade,
    useInventoryUnseenTracker,
    useMessageEvent,
    useOctaneEvent,
    useWiredTrading
} from '../../hooks';
import {
    BADGE_FILTER_ALL,
    BADGE_RARITY_FILTER_ALL,
    getInventoryBadgeRarityFilterIds,
    isAchievementBadgeCode,
    passInventoryBadgeFilter
} from './views/badge/inventoryBadgeFilters';
import { InventoryBadgeView } from './views/badge/InventoryBadgeView';
import { InventoryBotView } from './views/bot/InventoryBotView';
import { InventoryFurnitureDeleteView } from './views/furniture/InventoryFurnitureDeleteView';
import { InventoryFurnitureView } from './views/furniture/InventoryFurnitureView';
import { InventoryTradeMinimizedView } from './views/furniture/InventoryTradeMinimizedView';
import { InventoryTradeNameScamWarningView } from './views/furniture/InventoryTradeNameScamWarningView';
import { InventoryTradeView } from './views/furniture/InventoryTradeView';
import { InventoryWiredTradeView } from './views/furniture/InventoryWiredTradeView';
import { filterInventoryGroupItems, MAIN_FILTER_ALL, TYPE_FILTER_ANY } from './views/furniture/inventoryFurniFilters';
import { InventoryCategoryFilterView } from './views/InventoryCategoryFilterView';
import { InventoryPetView } from './views/pet/InventoryPetView';
import { InventoryPrefixView } from './views/prefix/InventoryPrefixView';

const TAB_FURNITURE: string = 'inventory.furni';
const TAB_BOTS: string = 'inventory.bots';
const TAB_PETS: string = 'inventory.furni.tab.pets';
const TAB_BADGES: string = 'inventory.badges';
const TAB_PREFIXES: string = 'inventory.prefixes';
const TABS = [TAB_FURNITURE, TAB_PETS, TAB_BADGES, TAB_PREFIXES, TAB_BOTS];

const TAB_BY_CODE: Record<string, string> = {
    furni: TAB_FURNITURE,
    furniture: TAB_FURNITURE,
    pets: TAB_PETS,
    badges: TAB_BADGES,
    prefixes: TAB_PREFIXES,
    bots: TAB_BOTS
};
const UNSEEN_CATEGORIES = [UnseenItemCategory.FURNI, UnseenItemCategory.PET, UnseenItemCategory.BADGE, UnseenItemCategory.PREFIX, UnseenItemCategory.BOT];

// AIR 13 keeps rented furni in the furni tab (HabboInventory.mergeRentFurni is always true), so
// their unseen counter (category 2) lands on the same tab as the owned furni.
const getTabUnseenCount = (index: number, getCount: (category: number) => number) => {
    const count = getCount(UNSEEN_CATEGORIES[index]);

    return UNSEEN_CATEGORIES[index] === UnseenItemCategory.FURNI ? count + getCount(UnseenItemCategory.RENTABLE) : count;
};

export const InventoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<string>(TABS[0]);
    const [roomSession, setRoomSession] = useState<IRoomSession>(null);
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);
    const [searchValue, setSearchValue] = useState('');
    const [mainFilter, setMainFilter] = useState<string>(MAIN_FILTER_ALL);
    const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ANY);
    const [badgeTypeFilter, setBadgeTypeFilter] = useState<string>(BADGE_FILTER_ALL);
    const [badgeRarityFilter, setBadgeRarityFilter] = useState<number>(BADGE_RARITY_FILTER_ALL);
    // The rarity tiers come from caches that fill asynchronously; bumping this recomputes the
    // badge filters once the leaderboard classification has arrived.
    const [badgeRarityRevision, setBadgeRarityRevision] = useState(0);
    const { isTrading = false, stopTrading = null, nameScamWarning = null, dismissNameScamWarning = null } = useInventoryTrade();
    const { isOpen: isWiredTrading = false } = useWiredTrading();
    const { getCount = null } = useInventoryUnseenTracker();
    const { groupItems = [] } = useInventoryFurni();
    const { badgeCodes = [] } = useInventoryBadges();

    useEffect(() => {
        setSearchValue('');
        setMainFilter(MAIN_FILTER_ALL);
        setTypeFilter(TYPE_FILTER_ANY);
        setBadgeTypeFilter(BADGE_FILTER_ALL);
        setBadgeRarityFilter(BADGE_RARITY_FILTER_ALL);
    }, [currentTab]);

    useEffect(() => {
        if (currentTab !== TAB_BADGES) return;

        let cancelled = false;

        ensureBadgeLeaderboardLoaded()
            .then(() => {
                if (!cancelled) setBadgeRarityRevision((previous) => previous + 1);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [currentTab]);

    // Changing the main filter swaps the type list underneath it; keeping the old type id would
    // silently filter with an option the dropdown no longer shows.
    const onMainFilterChange = (value: string) => {
        setMainFilter(value);
        setTypeFilter(TYPE_FILTER_ANY);
    };

    const filteredGroupItems = useMemo(
        () => filterInventoryGroupItems(groupItems, mainFilter, typeFilter, searchValue),
        [groupItems, searchValue, mainFilter, typeFilter]
    );

    const uncommonRarityEnabled = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) === true;

    // Achievement badges are collapsed to the highest level owned before any filter runs.
    const dedupedBadgeCodes = useMemo(() => {
        const achievementBadges = badgeCodes.filter((badge) => isAchievementBadgeCode(badge));
        const numberMap: { [key: string]: number } = {};

        achievementBadges.forEach((badge) => {
            const name = badge.split(/[\d]+/)[0];
            const number = Number(badge.replace(name, ''));

            if (numberMap[name] === undefined || number > numberMap[name]) numberMap[name] = number;
        });

        return Object.keys(numberMap)
            .map((name) => `${name}${numberMap[name]}`)
            .concat(badgeCodes.filter((badge) => !isAchievementBadgeCode(badge)));
    }, [badgeCodes]);

    // `badgeRarityRevision` is a dependency on purpose: the tier caches the helpers read are not
    // React state, so the memos have to be told when they filled.
    const badgeRarityFilterIds = useMemo(
        () => getInventoryBadgeRarityFilterIds(dedupedBadgeCodes, uncommonRarityEnabled),
        [dedupedBadgeCodes, uncommonRarityEnabled, badgeRarityRevision]
    );

    const filteredBadgeCodes = useMemo(
        () => dedupedBadgeCodes.filter((badgeCode) => passInventoryBadgeFilter(badgeCode, badgeTypeFilter, badgeRarityFilter, searchValue, uncommonRarityEnabled)),
        [dedupedBadgeCodes, badgeTypeFilter, badgeRarityFilter, searchValue, uncommonRarityEnabled, badgeRarityRevision]
    );

    const onClose = () => {
        if (isTrading) stopTrading();

        setIsVisible(false);
    };

    useOctaneEvent<RoomEngineObjectPlacedEvent>(RoomEngineObjectEvent.PLACED, (event) => {
        if (!isObjectMoverRequested()) return;

        setObjectMoverRequested(false);

        if (!event.placedInRoom) setIsVisible(true);
    });

    useOctaneEvent<RoomSessionEvent>([RoomSessionEvent.CREATED, RoomSessionEvent.ENDED], (event) => {
        switch (event.type) {
            case RoomSessionEvent.CREATED:
                setRoomSession(event.session);
                return;
            case RoomSessionEvent.ENDED:
                setRoomSession(null);
                setIsVisible(false);
                return;
        }
    });

    useMessageEvent<BadgePointLimitsEvent>(BadgePointLimitsEvent, (event) => {
        const parser = event.getParser();

        for (const data of parser.data) GetLocalizationManager().setBadgePointLimit(data.badgeId, data.limit);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        if (parts[2] && TAB_BY_CODE[parts[2]]) setCurrentTab(TAB_BY_CODE[parts[2]]);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        if (parts[2] && TAB_BY_CODE[parts[2]]) setCurrentTab(TAB_BY_CODE[parts[2]]);
                        return;
                }
            },
            eventUrlPrefix: 'inventory/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        setRoomPreviewer(new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER));

        return () => {
            setRoomPreviewer((prevValue) => {
                prevValue.dispose();

                return null;
            });
        };
    }, []);

    useEffect(() => {
        // A wired contract opens its negotiation without anyone asking for the inventory, so the
        // window has to show itself the same way a trade does.
        if (!isVisible && (isTrading || isWiredTrading)) setIsVisible(true);
    }, [isVisible, isTrading, isWiredTrading]);

    useEffect(() => {
        // TradingModel.startTrading ends with toggleInventoryPage("furni"): the trade lives in the
        // furni tab, every other tab only shows the minimised strip.
        if (isTrading) setCurrentTab(TAB_FURNITURE);
    }, [isTrading]);

    if (!isVisible) return null;

    const showTradeView = isTrading && currentTab === TAB_FURNITURE;
    const showTradeMinimized = isTrading && currentTab !== TAB_FURNITURE;
    const showFilter = !showTradeView && (currentTab === TAB_FURNITURE || currentTab === TAB_BADGES);

    return (
        <>
            <OctaneCardView
                className="octane-inventory-window min-w-0 w-[min(528px,calc(100vw-16px))] h-[min(420px,calc(100vh-16px))] min-h-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                uniqueKey="inventory"
            >
                <OctaneCardHeaderView headerText={LocalizeText('inventory.title')} onCloseClick={onClose} />
                {!isWiredTrading && (
                    <>
                        <OctaneCardTabsView classNames={['octane-inventory-tabs-shell']}>
                            {TABS.map((name, index) => {
                                return (
                                    <OctaneCardTabsItemView
                                        key={index}
                                        count={getTabUnseenCount(index, getCount)}
                                        isActive={currentTab === name}
                                        onClick={(event) => setCurrentTab(name)}
                                    >
                                        <span className="octane-inventory-tab-label">{LocalizeText(name)}</span>
                                    </OctaneCardTabsItemView>
                                );
                            })}
                        </OctaneCardTabsView>
                        <div className="octane-inventory-body flex flex-col overflow-hidden p-2 h-full gap-2">
                            {showFilter && (
                                <InventoryCategoryFilterView
                                    badgeRarityFilter={badgeRarityFilter}
                                    badgeRarityFilterIds={badgeRarityFilterIds}
                                    badgeTypeFilter={badgeTypeFilter}
                                    currentTab={currentTab}
                                    mainFilter={mainFilter}
                                    searchValue={searchValue}
                                    typeFilter={typeFilter}
                                    uncommonRarityEnabled={uncommonRarityEnabled}
                                    onBadgeRarityFilterChange={setBadgeRarityFilter}
                                    onBadgeTypeFilterChange={setBadgeTypeFilter}
                                    onMainFilterChange={onMainFilterChange}
                                    onSearchChange={setSearchValue}
                                    onTypeFilterChange={setTypeFilter}
                                />
                            )}
                            <div className="flex-1 overflow-hidden">
                                {showTradeView && <InventoryTradeView cancelTrade={onClose} />}
                                {currentTab === TAB_FURNITURE && !showTradeView && (
                                    <InventoryFurnitureView filteredGroupItems={filteredGroupItems} roomPreviewer={roomPreviewer} roomSession={roomSession} />
                                )}
                                {currentTab === TAB_PETS && <InventoryPetView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                                {currentTab === TAB_BADGES && <InventoryBadgeView filteredBadgeCodes={filteredBadgeCodes} />}
                                {currentTab === TAB_PREFIXES && <InventoryPrefixView />}
                                {currentTab === TAB_BOTS && <InventoryBotView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                            </div>
                            {showTradeMinimized && <InventoryTradeMinimizedView onCancel={stopTrading} onContinue={() => setCurrentTab(TAB_FURNITURE)} />}
                        </div>
                    </>
                )}
                {!isTrading && isWiredTrading && (
                    <div className="octane-inventory-body flex flex-col overflow-hidden p-2 h-full">
                        <InventoryWiredTradeView />
                    </div>
                )}
            </OctaneCardView>
            <InventoryFurnitureDeleteView />
            {nameScamWarning && <InventoryTradeNameScamWarningView warning={nameScamWarning} onClose={dismissNameScamWarning} />}
        </>
    );
};
