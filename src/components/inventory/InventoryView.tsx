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
import {
    ensureBadgeLeaderboardLoaded,
    filterFurnitureGroupItems,
    FURNI_MAIN_FILTER,
    FurniMainFilter,
    getCachedBadgeRarityStat,
    isObjectMoverRequested,
    LocalizeBadgeName,
    LocalizeText,
    setObjectMoverRequested,
    UnseenItemCategory
} from '../../api';
import { OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import {
    useInventoryBadges,
    useInventoryFurni,
    useInventoryTrade,
    useInventoryUnseenTracker,
    useMessageEvent,
    useOctaneEvent,
    useWiredTrading
} from '../../hooks';
import { InventoryBadgeView } from './views/badge/InventoryBadgeView';
import { InventoryBotView } from './views/bot/InventoryBotView';
import { InventoryFurnitureDeleteView } from './views/furniture/InventoryFurnitureDeleteView';
import { InventoryFurnitureView } from './views/furniture/InventoryFurnitureView';
import { InventoryTradeNameScamWarningView } from './views/furniture/InventoryTradeNameScamWarningView';
import { InventoryTradeView } from './views/furniture/InventoryTradeView';
import { InventoryWiredTradeView } from './views/furniture/InventoryWiredTradeView';
import { BADGE_MAIN_ACHIEVEMENTS, BADGE_MAIN_ALL, BADGE_MAIN_NORMAL, BADGE_RARITY_ALL, InventoryCategoryFilterView } from './views/InventoryCategoryFilterView';
import { InventoryPetView } from './views/pet/InventoryPetView';
import { InventoryPrefixView } from './views/prefix/InventoryPrefixView';

const TAB_FURNITURE = 'inventory.furni';
const TAB_BOTS = 'inventory.bots';
const TAB_PETS = 'inventory.furni.tab.pets';
const TAB_BADGES = 'inventory.badges';
const TAB_PREFIXES = 'inventory.prefixes';
const TABS = [TAB_FURNITURE, TAB_PETS, TAB_BADGES, TAB_BOTS, TAB_PREFIXES];

const TAB_LABEL_FALLBACK: Record<string, string> = {
    [TAB_FURNITURE]: 'Furniture',
    [TAB_PETS]: 'Pets',
    [TAB_BADGES]: 'Badges',
    [TAB_BOTS]: 'Bots',
    [TAB_PREFIXES]: 'Prefixes'
};

const tabLabel = (name: string) => {
    const value = LocalizeText(name);

    if (name === TAB_BADGES && value === 'Achieved badges') return 'Badges';

    return value && value !== name ? value : TAB_LABEL_FALLBACK[name] || name;
};

const TAB_BY_CODE: Record<string, string> = {
    furni: TAB_FURNITURE,
    furniture: TAB_FURNITURE,
    pets: TAB_PETS,
    badges: TAB_BADGES,
    prefixes: TAB_PREFIXES,
    bots: TAB_BOTS
};

const UNSEEN_BY_TAB: Record<string, number> = {
    [TAB_FURNITURE]: UnseenItemCategory.FURNI,
    [TAB_PETS]: UnseenItemCategory.PET,
    [TAB_BADGES]: UnseenItemCategory.BADGE,
    [TAB_BOTS]: UnseenItemCategory.BOT,
    [TAB_PREFIXES]: UnseenItemCategory.PREFIX
};

// AIR 13 keeps rented furni in the furni tab, so their unseen counter lands with owned furni.
const getTabUnseenCount = (name: string, getCount: (category: number) => number) => {
    const category = UNSEEN_BY_TAB[name];
    const count = getCount(category);
    return category === UnseenItemCategory.FURNI ? count + getCount(UnseenItemCategory.RENTABLE) : count;
};

const RARITY_TO_ID: Record<string, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    mythical: 4,
    legendary: 5,
    unique: 6
};

export const InventoryView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<string>(TABS[0]);
    const [roomSession, setRoomSession] = useState<IRoomSession>(null);
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);
    const [searchValue, setSearchValue] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [badgeMetadata, setBadgeMetadata] = useState<Awaited<ReturnType<typeof ensureBadgeLeaderboardLoaded>>>(null);
    const [mainFilter, setMainFilter] = useState<string>(FURNI_MAIN_FILTER.ALL);
    const [typeFilter, setTypeFilter] = useState<string>('any');
    const { isTrading = false, stopTrading = null, nameScamWarning = null, dismissNameScamWarning = null } = useInventoryTrade();
    const { isOpen: isWiredTrading = false } = useWiredTrading();
    const { getCount = null } = useInventoryUnseenTracker();
    const { groupItems = [] } = useInventoryFurni();
    const { badgeCodes = [] } = useInventoryBadges();

    useEffect(() => {
        setSearchValue('');
        setAppliedSearch('');
        if (currentTab === TAB_BADGES) {
            setMainFilter(BADGE_MAIN_ALL);
            setTypeFilter(String(BADGE_RARITY_ALL));
            ensureBadgeLeaderboardLoaded()
                .then(setBadgeMetadata)
                .catch(() => setBadgeMetadata(null));
        } else {
            setMainFilter(FURNI_MAIN_FILTER.ALL);
            setTypeFilter('any');
        }
    }, [currentTab]);

    useEffect(() => {
        if (currentTab !== TAB_FURNITURE) return;
        setTypeFilter('any');
    }, [mainFilter, currentTab]);

    const filteredGroupItems = useMemo(() => {
        if (currentTab !== TAB_FURNITURE) return groupItems;

        return filterFurnitureGroupItems(groupItems, appliedSearch, mainFilter as FurniMainFilter, typeFilter);
    }, [groupItems, appliedSearch, mainFilter, typeFilter, currentTab]);

    const filteredBadgeCodes = useMemo(() => {
        const comparison = appliedSearch.toLocaleLowerCase().trim();
        const rarityFilter = Number(typeFilter);

        const achievementBadges = badgeCodes.filter((badge) => badge.startsWith('ACH_'));
        const numberMap: { [key: string]: number } = {};

        achievementBadges.forEach((badge) => {
            const name = badge.split(/[\d]+/)[0];
            const number = Number(badge.replace(name, ''));

            if (numberMap[name] === undefined || number > numberMap[name]) numberMap[name] = number;
        });

        let deduped = Object.keys(numberMap)
            .map((name) => `${name}${numberMap[name]}`)
            .concat(badgeCodes.filter((badge) => !badge.startsWith('ACH_')));

        if (mainFilter === BADGE_MAIN_NORMAL) deduped = deduped.filter((code) => !code.startsWith('ACH_'));
        if (mainFilter === BADGE_MAIN_ACHIEVEMENTS) deduped = deduped.filter((code) => code.startsWith('ACH_'));

        return deduped.filter((badgeCode) => {
            if (!LocalizeBadgeName(badgeCode).toLocaleLowerCase().includes(comparison)) return false;
            if (rarityFilter === BADGE_RARITY_ALL) return true;

            const stat = badgeMetadata ? getCachedBadgeRarityStat(badgeCode) : null;
            if (!stat) return rarityFilter === 0;

            return (RARITY_TO_ID[stat.rarity] ?? -99) === rarityFilter;
        });
    }, [badgeCodes, appliedSearch, mainFilter, typeFilter, badgeMetadata]);

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
        const previewer = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        previewer.backgroundColor = null;
        setRoomPreviewer(previewer);
        return () => {
            setRoomPreviewer((prevValue) => {
                prevValue.dispose();
                return null;
            });
        };
    }, []);

    useEffect(() => {
        if (!isVisible && (isTrading || isWiredTrading)) setIsVisible(true);
    }, [isVisible, isTrading, isWiredTrading]);

    if (!isVisible) return null;

    const showFilter = !isTrading && !isWiredTrading && ((currentTab === TAB_FURNITURE && groupItems.length > 0) || currentTab === TAB_BADGES);

    return (
        <>
            <OctaneCardView
                className={`octane-inventory-window max-w-[calc(100vw-16px)] ${currentTab === TAB_BADGES ? 'has-badge-controls' : currentTab === TAB_PETS ? 'has-pet-controls' : ''}`}
                frameStyle={3}
                resizeAxis="vertical"
                uniqueKey="inventory"
            >
                <OctaneCardHeaderView headerText={LocalizeText('inventory.title')} onCloseClick={onClose} />
                {!isTrading && !isWiredTrading && (
                    <>
                        <OctaneCardTabsView classNames={['octane-inventory-tabs-shell']}>
                            {TABS.map((name) => (
                                <OctaneCardTabsItemView
                                    key={name}
                                    count={getTabUnseenCount(name, getCount)}
                                    isActive={currentTab === name}
                                    onClick={() => setCurrentTab(name)}
                                >
                                    <span className="octane-inventory-tab-label">{tabLabel(name)}</span>
                                </OctaneCardTabsItemView>
                            ))}
                        </OctaneCardTabsView>
                        <div className="octane-inventory-body">
                            {showFilter && (
                                <InventoryCategoryFilterView
                                    currentTab={currentTab}
                                    mainFilter={mainFilter}
                                    typeFilter={typeFilter}
                                    searchValue={searchValue}
                                    onMainFilterChange={(value) => {
                                        setMainFilter(value);
                                        setAppliedSearch(searchValue);
                                    }}
                                    onTypeFilterChange={(value) => {
                                        setTypeFilter(value);
                                        setAppliedSearch(searchValue);
                                    }}
                                    onSearchChange={setSearchValue}
                                    onSearchApply={setAppliedSearch}
                                />
                            )}
                            <div className={`octane-inventory-content ${currentTab === TAB_FURNITURE ? 'is-furniture' : ''}`}>
                                {currentTab === TAB_FURNITURE && (
                                    <InventoryFurnitureView filteredGroupItems={filteredGroupItems} roomPreviewer={roomPreviewer} roomSession={roomSession} />
                                )}
                                {currentTab === TAB_PETS && <InventoryPetView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                                {currentTab === TAB_BADGES && <InventoryBadgeView filteredBadgeCodes={filteredBadgeCodes} />}
                                {currentTab === TAB_BOTS && <InventoryBotView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                                {currentTab === TAB_PREFIXES && <InventoryPrefixView />}
                            </div>
                        </div>
                    </>
                )}
                {isTrading && (
                    <div className="octane-inventory-body is-trade">
                        <InventoryTradeView cancelTrade={onClose} />
                    </div>
                )}
                {!isTrading && isWiredTrading && (
                    <div className="octane-inventory-body is-trade">
                        <InventoryWiredTradeView />
                    </div>
                )}
                            {nameScamWarning && <InventoryTradeNameScamWarningView warning={nameScamWarning} onClose={dismissNameScamWarning} />}
            </OctaneCardView>
            <InventoryFurnitureDeleteView />
        </>
    );
};
