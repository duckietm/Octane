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
import { isObjectMoverRequested, LocalizeBadgeName, LocalizeText, setObjectMoverRequested, UnseenItemCategory } from '../../api';
import { OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import {
    useInventoryBadges,
    useInventoryFurni,
    useInventoryPrefixes,
    useInventoryTrade,
    useWiredTrading,
    useInventoryUnseenTracker,
    useMessageEvent,
    useOctaneEvent
} from '../../hooks';
import { InventoryBadgeView } from './views/badge/InventoryBadgeView';
import { InventoryBotView } from './views/bot/InventoryBotView';
import { InventoryFurnitureDeleteView } from './views/furniture/InventoryFurnitureDeleteView';
import { InventoryFurnitureView } from './views/furniture/InventoryFurnitureView';
import { InventoryTradeView } from './views/furniture/InventoryTradeView';
import { InventoryWiredTradeView } from './views/furniture/InventoryWiredTradeView';
import { FILTER_EVERYTHING, FILTER_FLOOR, FILTER_WALL, InventoryCategoryFilterView } from './views/InventoryCategoryFilterView';
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

export const InventoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<string>(TABS[0]);
    const [roomSession, setRoomSession] = useState<IRoomSession>(null);
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);
    const [searchValue, setSearchValue] = useState('');
    const [filterType, setFilterType] = useState<string>(FILTER_EVERYTHING);
    const { isTrading = false, stopTrading = null } = useInventoryTrade();
    const { isOpen: isWiredTrading = false } = useWiredTrading();
    const { getCount = null } = useInventoryUnseenTracker();
    const { groupItems = [] } = useInventoryFurni();
    const { badgeCodes = [] } = useInventoryBadges();

    useEffect(() => {
        setSearchValue('');
        setFilterType(FILTER_EVERYTHING);
    }, [currentTab]);

    const filteredGroupItems = useMemo(() => {
        const comparison = searchValue.toLocaleLowerCase();

        if (filterType === FILTER_EVERYTHING) {
            return groupItems.filter((item) => item.name.toLocaleLowerCase().includes(comparison));
        }

        return groupItems.filter((item) => {
            const isWall = filterType === FILTER_WALL ? item.isWallItem : false;
            const isFloor = filterType === FILTER_FLOOR ? !item.isWallItem : false;
            const matchesSearch = item.name.toLocaleLowerCase().includes(comparison);

            return comparison.length ? matchesSearch && (isWall || isFloor) : isWall || isFloor;
        });
    }, [groupItems, searchValue, filterType]);

    const filteredBadgeCodes = useMemo(() => {
        const comparison = searchValue.toLocaleLowerCase().replace(' ', '');

        const achievementBadges = badgeCodes.filter((badge) => badge.startsWith('ACH_'));
        const numberMap: { [key: string]: number } = {};

        achievementBadges.forEach((badge) => {
            const name = badge.split(/[\d]+/)[0];
            const number = Number(badge.replace(name, ''));

            if (numberMap[name] === undefined || number > numberMap[name]) numberMap[name] = number;
        });

        const deduped = Object.keys(numberMap)
            .map((name) => `${name}${numberMap[name]}`)
            .concat(badgeCodes.filter((badge) => !badge.startsWith('ACH_')));

        return deduped.filter((badgeCode) => LocalizeBadgeName(badgeCode).toLocaleLowerCase().includes(comparison));
    }, [badgeCodes, searchValue]);

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

    if (!isVisible) return null;

    const showFilter = !isTrading && (currentTab === TAB_FURNITURE || currentTab === TAB_BADGES);

    return (
        <>
            <OctaneCardView
                className="octane-inventory-window min-w-0 w-[min(528px,calc(100vw-16px))] h-[min(420px,calc(100vh-16px))] min-h-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                uniqueKey="inventory"
            >
                <OctaneCardHeaderView headerText={LocalizeText('inventory.title')} onCloseClick={onClose} />
                {!isTrading && !isWiredTrading && (
                    <>
                        <OctaneCardTabsView classNames={['octane-inventory-tabs-shell']}>
                            {TABS.map((name, index) => {
                                return (
                                    <OctaneCardTabsItemView
                                        key={index}
                                        count={getCount(UNSEEN_CATEGORIES[index])}
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
                                    currentTab={currentTab}
                                    filterType={filterType}
                                    searchValue={searchValue}
                                    onFilterTypeChange={setFilterType}
                                    onSearchChange={setSearchValue}
                                />
                            )}
                            <div className="flex-1 overflow-hidden">
                                {currentTab === TAB_FURNITURE && (
                                    <InventoryFurnitureView filteredGroupItems={filteredGroupItems} roomPreviewer={roomPreviewer} roomSession={roomSession} />
                                )}
                                {currentTab === TAB_PETS && <InventoryPetView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                                {currentTab === TAB_BADGES && <InventoryBadgeView filteredBadgeCodes={filteredBadgeCodes} />}
                                {currentTab === TAB_PREFIXES && <InventoryPrefixView />}
                                {currentTab === TAB_BOTS && <InventoryBotView roomPreviewer={roomPreviewer} roomSession={roomSession} />}
                            </div>
                        </div>
                    </>
                )}
                {isTrading && (
                    <div className="octane-inventory-body flex flex-col overflow-hidden p-2 h-full">
                        <InventoryTradeView cancelTrade={onClose} />
                    </div>
                )}
                {!isTrading && isWiredTrading && (
                    <div className="octane-inventory-body flex flex-col overflow-hidden p-2 h-full">
                        <InventoryWiredTradeView />
                    </div>
                )}
            </OctaneCardView>
            <InventoryFurnitureDeleteView />
        </>
    );
};
